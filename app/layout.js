import "./globals.css";

export const metadata = {
  title: "AI Job Application Generator",
  description: "Turn any CV + job description into an ATS-optimized CV, cover letter, skills gap analysis, and interview prep — in seconds.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
