import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                cyan: {
                    50: '#e6f7f7',
                    100: '#b3e8e9',
                    200: '#80d9db',
                    300: '#4dcacd',
                    400: '#1abbbf',
                    500: '#08a3a5',
                    600: '#08a3a5',
                    700: '#067c7e',
                    800: '#055557',
                    900: '#032e2f',
                },
            },
            fontFamily: {
                sans: ['DM Sans', 'Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
};

export default config;
