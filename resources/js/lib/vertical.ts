export type StrictVertical = 'daily_fresh' | 'society_fresh';

export const DEFAULT_VERTICAL: StrictVertical = 'daily_fresh';

export const normalizeVertical = (value: string | null | undefined): StrictVertical => {
    if (value === 'daily_fresh' || value === 'society_fresh') {
        return value;
    }

    return DEFAULT_VERTICAL;
};

export const getVerticalFromQuery = (queryString: string): StrictVertical => {
    const queryParams = new URLSearchParams(queryString);

    return normalizeVertical(queryParams.get('vertical'));
};
