import './styles.css';

export const metadata = {
  title: 'Connecteam Certificate Automation',
  description: 'Generate PDF certificates from Connecteam form submissions.'
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
