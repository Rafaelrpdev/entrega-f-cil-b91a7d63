import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types/product";
import { useCart } from "@/contexts/CartContext";

interface Props {
  product: Product;
  onSelect: (product: Product) => void;
}

export default function ProductCard({ product, onSelect }: Props) {
  const { addItem } = useCart();

  // 🛒 Adicionar 1 item direto
  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();

    addItem(product, 1); // 🔧 agora compatível com ProductDetail
  };

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="bg-card rounded-xl shadow-sm border border-border overflow-hidden cursor-pointer hover:shadow-md transition"
      onClick={() => onSelect(product)}
    >
      {/* 🖼️ Imagem */}
      <div className="aspect-square bg-muted p-4 flex items-center justify-center">
        <img
          src={product.image || "/placeholder.png"}
          alt={product.name}
          className="w-full h-full object-contain"
          loading="lazy"
          width={512}
          height={512}
        />
      </div>

      {/* 📄 Conteúdo */}
      <div className="p-4 space-y-2">

        {/* Nome */}
        <h3 className="font-semibold text-card-foreground text-sm line-clamp-2">
          {product.name}
        </h3>

        {/* Preço */}
        <p className="text-lg font-bold text-primary">
          R$ {product.price.toFixed(2).replace(".", ",")}
        </p>

        {/* Botão adicionar */}
        <Button
          size="sm"
          className="w-full gap-2"
          onClick={handleAdd}
        >
          <ShoppingCart className="w-4 h-4" />
          Adicionar
        </Button>

      </div>
    </motion.div>
  );
}
