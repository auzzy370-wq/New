export declare enum OnboardingStep {
    ACCOUNT_CREATED = 1,
    BUSINESS_INFO = 2,
    BUSINESS_TYPE = 3,
    BUSINESS_ADDRESS = 4,
    OWNER_INFO = 5,
    STRIPE_ONBOARDING = 6,
    KYC_KYB = 7,
    BANK_SETUP = 8,
    SUBSCRIPTION = 9,
    LOCATION = 10,
    PRODUCTS = 11,
    DEVICE = 12,
    TAP_TO_PAY = 13,
    TEST_TRANSACTION = 14,
    COMPLETE = 15
}
export declare class BusinessInfoDto {
    name: string;
    email?: string;
    phone?: string;
    website?: string;
    description?: string;
}
export declare class BusinessTypeDto {
    businessType: string;
    taxId?: string;
    businessCategory?: string;
}
export declare class BusinessAddressDto {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    timezone?: string;
}
export declare class OwnerInfoDto {
    firstName: string;
    lastName: string;
    phone?: string;
    title?: string;
}
export declare class CreateOnboardingLocationDto {
    name: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    timezone?: string;
    phone?: string;
    email?: string;
    defaultTaxRate?: number;
}
export declare class AdvanceStepDto {
    step: number;
    skipStep?: boolean;
}
