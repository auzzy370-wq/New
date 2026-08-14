declare const _default: (() => {
    env: string;
    port: number;
    frontendUrl: string;
    allowedOrigins: string[];
    adminEmail: string | undefined;
    adminSecret: string | undefined;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    env: string;
    port: number;
    frontendUrl: string;
    allowedOrigins: string[];
    adminEmail: string | undefined;
    adminSecret: string | undefined;
}>;
export default _default;
