import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: '현장 점검 앱',
    description: '현장 점검 내용을 쉽고 빠르게 등록하세요.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ko">
            <body>{children}</body>
        </html>
    );
}
