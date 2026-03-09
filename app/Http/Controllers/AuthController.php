<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\GoogleAuthCallbackRequest;
use App\Http\Requests\Auth\GoogleAuthRedirectRequest;
use App\Http\Requests\Auth\ResendOtpRequest;
use App\Http\Requests\Auth\SendOtpRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Models\SocialAccount;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    public function __construct(
        private OtpService $otpService
    ) {}

    public function showLoginForm(): Response
    {
        $messages = session('errors')?->getBag('default')->getMessages() ?? [];
        $errors = collect($messages)->map(fn (array $msgs): string => $msgs[0] ?? '')->all();

        return Inertia::render('auth/login', [
            'otp_sent' => session('otp_sent'),
            'phone' => session('phone'),
            'message' => session('message'),
            'debug_otp' => session('debug_otp'),
            'resend_available_in' => session('resend_available_in', 0),
            'otp_expires_in' => session('otp_expires_in', $this->otpService->getOtpTtlSeconds()),
            'errors' => $errors,
        ]);
    }

    public function redirectToGoogle(GoogleAuthRedirectRequest $request): RedirectResponse
    {
        $googleConfig = $this->googleConfig();

        if (! $googleConfig['is_configured']) {
            return redirect()->route('login')->withErrors([
                'google' => 'Google sign-in is not configured yet. Please contact support.',
            ]);
        }

        $state = Str::random(40);

        $request->session()->put('google_oauth_state', $state);
        $request->session()->put('google_auth_context', [
            'language' => $request->validated('language'),
            'consent' => $request->boolean('consent'),
        ]);

        $query = http_build_query([
            'client_id' => $googleConfig['client_id'],
            'redirect_uri' => $googleConfig['redirect_uri'],
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $state,
            'prompt' => 'select_account',
            'access_type' => 'offline',
        ]);

        return redirect()->away('https://accounts.google.com/o/oauth2/v2/auth?'.$query);
    }

    public function handleGoogleCallback(GoogleAuthCallbackRequest $request): RedirectResponse
    {
        if ($request->filled('error')) {
            return redirect()->route('login')->withErrors([
                'google' => 'Google sign-in was cancelled. Please try again.',
            ]);
        }

        $expectedState = (string) $request->session()->pull('google_oauth_state', '');
        $incomingState = (string) $request->validated('state');

        if ($expectedState === '' || ! hash_equals($expectedState, $incomingState)) {
            return redirect()->route('login')->withErrors([
                'google' => 'Unable to verify Google sign-in request. Please try again.',
            ]);
        }

        $googleConfig = $this->googleConfig();

        if (! $googleConfig['is_configured']) {
            return redirect()->route('login')->withErrors([
                'google' => 'Google sign-in is not configured yet. Please contact support.',
            ]);
        }

        $tokenResponse = Http::asForm()
            ->acceptJson()
            ->post('https://oauth2.googleapis.com/token', [
                'code' => $request->validated('code'),
                'client_id' => $googleConfig['client_id'],
                'client_secret' => $googleConfig['client_secret'],
                'redirect_uri' => $googleConfig['redirect_uri'],
                'grant_type' => 'authorization_code',
            ]);

        if ($tokenResponse->failed()) {
            return redirect()->route('login')->withErrors([
                'google' => 'Unable to complete Google sign-in right now. Please try again.',
            ]);
        }

        $accessToken = (string) data_get($tokenResponse->json(), 'access_token', '');

        if ($accessToken === '') {
            return redirect()->route('login')->withErrors([
                'google' => 'Google sign-in returned an invalid response. Please try again.',
            ]);
        }

        $profileResponse = Http::acceptJson()
            ->withToken($accessToken)
            ->get('https://www.googleapis.com/oauth2/v3/userinfo');

        if ($profileResponse->failed()) {
            return redirect()->route('login')->withErrors([
                'google' => 'Unable to fetch your Google profile. Please try again.',
            ]);
        }

        $profile = $profileResponse->json();

        $providerId = (string) data_get($profile, 'sub', '');
        $email = Str::lower((string) data_get($profile, 'email', ''));
        $isEmailVerified = (bool) data_get($profile, 'email_verified', false);
        $avatar = (string) data_get($profile, 'picture', '');

        if ($providerId === '') {
            return redirect()->route('login')->withErrors([
                'google' => 'Unable to validate your Google account identity. Please try again.',
            ]);
        }

        if ($email === '' || ! $isEmailVerified) {
            return redirect()->route('login')->withErrors([
                'google' => 'Your Google account must have a verified email to continue.',
            ]);
        }

        $authContext = (array) $request->session()->pull('google_auth_context', []);
        $language = (string) ($authContext['language'] ?? 'en');
        $consent = (bool) ($authContext['consent'] ?? false);

        if (! in_array($language, ['en', 'hi', 'ml'], true)) {
            $language = 'en';
        }

        $displayName = trim((string) data_get($profile, 'name', ''));

        $socialAccount = SocialAccount::query()
            ->with('user')
            ->where('provider', 'google')
            ->where('provider_id', $providerId)
            ->first();

        if ($socialAccount !== null) {
            $user = $socialAccount->user;
        } else {
            $user = User::query()->where('email', $email)->first();

            if ($user === null) {
                $user = User::query()->create([
                    'name' => $displayName !== '' ? $displayName : 'Customer',
                    'email' => $email,
                    'phone' => null,
                    'role' => User::ROLE_CUSTOMER,
                    'preferred_language' => $language,
                    'communication_consent' => $consent,
                    'password' => Hash::make(Str::random(32)),
                    'email_verified_at' => now(),
                    'last_login_at' => now(),
                ]);
            }
        }

        SocialAccount::query()->firstOrCreate(
            [
                'provider' => 'google',
                'provider_id' => $providerId,
            ],
            [
                'user_id' => $user->id,
                'avatar' => $avatar !== '' ? $avatar : null,
            ]
        );

        $user->update([
            'name' => $displayName !== '' ? $displayName : $user->name,
            'preferred_language' => $language,
            'communication_consent' => $consent,
            'email' => $user->email ?? $email,
            'email_verified_at' => $user->email_verified_at ?? now(),
            'last_login_at' => now(),
        ]);

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return redirect()->route('location.select')->with('success', 'Logged in successfully.');
    }

    public function sendOtp(SendOtpRequest $request): RedirectResponse
    {
        $phone = $request->validated('phone');
        $language = $request->validated('language');
        $consent = $request->boolean('consent');
        $ip = $request->ip();
        $deviceInfo = OtpService::getDeviceInfoFromRequest($request);

        $otpRecord = $this->otpService->generateOtp($phone, $ip, $deviceInfo);

        if (config('app.debug')) {
            logger()->info('OTP for '.$phone.': '.$otpRecord->otp);
        }

        return back()->with([
            'otp_sent' => true,
            'phone' => $phone,
            'language' => $language,
            'consent' => $consent,
            'message' => 'OTP sent to your phone.',
            'debug_otp' => $this->debugOtpForTesting($otpRecord->otp),
            'resend_available_in' => $this->otpService->getResendCooldownSeconds($phone),
            'otp_expires_in' => $this->otpService->getOtpTtlSeconds(),
        ]);
    }

    public function resendOtp(ResendOtpRequest $request): RedirectResponse
    {
        $phone = $request->validated('phone');
        $language = $request->validated('language') ?? 'en';
        $consent = $request->boolean('consent');
        $ip = $request->ip();
        $deviceInfo = OtpService::getDeviceInfoFromRequest($request);

        $this->otpService->validateResendCooldown($phone);
        $otpRecord = $this->otpService->generateOtp($phone, $ip, $deviceInfo);

        if (config('app.debug')) {
            logger()->info('Resent OTP for '.$phone.': '.$otpRecord->otp);
        }

        return back()->with([
            'otp_sent' => true,
            'phone' => $phone,
            'language' => $language,
            'consent' => $consent,
            'message' => 'A new OTP has been sent.',
            'debug_otp' => $this->debugOtpForTesting($otpRecord->otp),
            'resend_available_in' => $this->otpService->getResendCooldownSeconds($phone),
            'otp_expires_in' => $this->otpService->getOtpTtlSeconds(),
        ]);
    }

    public function verifyOtp(VerifyOtpRequest $request): RedirectResponse
    {
        $phone = $request->validated('phone');
        $otp = $request->validated('otp');
        $language = $request->get('language', 'en');
        $consent = $request->boolean('consent', false);

        // Development bypass: allow OTP "000000" in debug mode
        $isValidOtp = config('app.debug') && $otp === '000000'
            ? true
            : $this->otpService->verifyOtp($phone, $otp);

        if (! $isValidOtp) {
            throw ValidationException::withMessages([
                'otp' => ['Invalid or expired OTP. Please try again.'],
            ]);
        }

        $user = User::query()->firstOrCreate(
            ['phone' => $phone],
            [
                'name' => 'User '.substr($phone, -4),
                'email' => $this->buildPhoneLoginEmail($phone),
                'role' => User::ROLE_CUSTOMER,
                'preferred_language' => $language,
                'communication_consent' => $consent,
                'password' => Hash::make(Str::random(32)),
                'phone_verified_at' => now(),
            ]
        );

        $user->update([
            'phone_verified_at' => now(),
            'last_login_at' => now(),
            'preferred_language' => $language,
            'communication_consent' => $consent,
        ]);

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return redirect()->route('location.select')->with('success', 'Logged in successfully.');
    }

    public function linkPhoneWithOtp(VerifyOtpRequest $request): RedirectResponse
    {
        $phone = $request->validated('phone');
        $otp = $request->validated('otp');
        $language = $request->get('language', 'en');
        $consent = $request->boolean('consent', false);

        $isValidOtp = config('app.debug') && $otp === '000000'
            ? true
            : $this->otpService->verifyOtp($phone, $otp);

        if (! $isValidOtp) {
            throw ValidationException::withMessages([
                'otp' => ['Invalid or expired OTP. Please try again.'],
            ]);
        }

        /** @var User $currentUser */
        $currentUser = $request->user();

        $existingPhoneUser = User::query()
            ->where('phone', $phone)
            ->whereKeyNot($currentUser->id)
            ->first();

        if ($existingPhoneUser !== null) {
            throw ValidationException::withMessages([
                'phone' => ['This phone number is already linked to another account.'],
            ]);
        }

        $currentUser->update([
            'phone' => $phone,
            'phone_verified_at' => now(),
            'preferred_language' => $language,
            'communication_consent' => $consent,
            'last_login_at' => now(),
        ]);

        return redirect()->route('location.select')->with('success', 'Phone number linked successfully.');
    }

    public function logout(): RedirectResponse
    {
        Auth::guard('web')->logout();
        request()->session()->invalidate();
        request()->session()->regenerateToken();

        return redirect()->route('home');
    }

    private function debugOtpForTesting(string $otp): ?string
    {
        if (! config('app.debug') || config('services.sms.driver') !== 'log') {
            return null;
        }

        return $otp;
    }

    private function buildPhoneLoginEmail(string $phone): string
    {
        return 'phone.'.$phone.'@freshtick.local';
    }

    /**
     * @return array{client_id: string, client_secret: string, redirect_uri: string, is_configured: bool}
     */
    private function googleConfig(): array
    {
        $clientId = trim((string) config('services.google.client_id'));
        $clientSecret = trim((string) config('services.google.client_secret'));
        $redirectUri = trim((string) config('services.google.redirect'));

        return [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'redirect_uri' => $redirectUri,
            'is_configured' => $clientId !== '' && $clientSecret !== '' && $redirectUri !== '',
        ];
    }
}
