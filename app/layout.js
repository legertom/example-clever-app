export const metadata = {
  title: "Example Clever App — SSO + Secure Sync",
  description: "Sample app for Clever SSO and Secure Sync rostering",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          maxWidth: 760,
          margin: "3rem auto",
          padding: "0 1rem",
          lineHeight: 1.5,
        }}
      >
        {children}
      </body>
    </html>
  );
}
