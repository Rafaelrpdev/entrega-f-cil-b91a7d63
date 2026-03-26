import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import banner1 from '@/assets/banner1.jpg';
import banner2 from '@/assets/banner2.jpg';

const banners = [
  { id: 1, image: banner1, alt: 'Entrega rápida de gás e água' },
  { id: 2, image: banner2, alt: 'Delivery rápido' },
];

export default function PromoBanner() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full aspect-[5/2] rounded-xl overflow-hidden bg-muted">
      <AnimatePresence mode="wait">
        <motion.img
          key={banners[current].id}
          src={banners[current].image}
          alt={banners[current].alt}
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      </AnimatePresence>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${i === current ? 'bg-primary' : 'bg-card/60'}`}
          />
        ))}
      </div>
    </div>
  );
}
