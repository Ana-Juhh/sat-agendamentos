import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import CalendarSection from '@/components/CalendarSection';
import Footer from '@/components/Footer';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}


export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <CalendarSection />
      </main>
      <Footer />
    </>
  );
}