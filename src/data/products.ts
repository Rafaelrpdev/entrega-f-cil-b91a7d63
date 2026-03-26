import gasImg from '@/assets/gas.jpg';
import aguaImg from '@/assets/agua.jpg';
import carvaoImg from '@/assets/carvao.jpg';
import type { Product } from '@/types/product';

export const products: Product[] = [
  {
    id: 'gas-13kg',
    name: 'Gás de Cozinha 13kg',
    description: 'Botijão de gás GLP 13kg. Ideal para uso doméstico, com rendimento médio de 45 dias. Entrega rápida e segura na sua porta.',
    price: 110.00,
    image: gasImg,
    category: 'gas',
  },
  {
    id: 'agua-20l',
    name: 'Água Mineral 20L',
    description: 'Galão de água mineral 20 litros. Água pura e cristalina, ideal para toda a família. Qualidade garantida.',
    price: 12.00,
    image: aguaImg,
    category: 'agua',
  },
  {
    id: 'carvao-3kg',
    name: 'Carvão Vegetal 3kg',
    description: 'Saco de carvão vegetal 3kg. Perfeito para churrascos e grelhados. Acende fácil e dura mais.',
    price: 18.00,
    image: carvaoImg,
    category: 'carvao',
  },
];
