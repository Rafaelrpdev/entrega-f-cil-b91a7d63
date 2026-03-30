import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import banner1 from '@/assets/banner1.jpg';
import banner2 from '@/assets/banner2.jpg';

const fallbackBanners = [
  { id: '1', image_url: banner1, alt: 'Entrega rápida de gás e água' },
  { id: '2', image_url: banner2, alt: 'Delivery rápido' },
];

export default function PromoBanner() {
  const [current, setCurrent] = useState(0);

  const { data: dbBanners } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data, error } = await supabase.from('banners').select('*').eq('active', true).order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const banners = dbBanners && dbBanners.length > 0
    ? dbBanners.map(b => ({ id: b.id, image_url: b.image_url, alt: b.alt }))
    : fallbackBanners;

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    setCurrent(0);
  }, [dbBanners]);

  return (
    <div className="relative w-full aspect-[5/2] rounded-xl overflow-hidden bg-muted">
      <AnimatePresence mode="wait">
        <motion.img
          key={banners[current]?.id}
          src={banners[current]?.image_url}
          alt={banners[current]?.alt}
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      </AnimatePresence>
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${i === current ? 'bg-primary' : 'bg-card/60'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
