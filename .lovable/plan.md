

# Plano: Notificações Push, Busca de Produtos e Histórico de Endereços

## Resumo

Três melhorias para o app de revenda de gás:
1. **Notificações push in-app** quando o status do pedido mudar
2. **Busca e filtro por categoria** na página principal
3. **Histórico de endereços** salvos para pedidos recorrentes

---

## 1. Notificações Push de Status do Pedido

Como o app é web (não PWA nativo), a abordagem será **notificações em tempo real via Supabase Realtime** + toast visual + sino de notificações no header.

### Database
- Criar tabela `notifications` com: `id`, `user_id`, `title`, `message`, `read` (boolean), `created_at`
- Habilitar Realtime na tabela: `ALTER PUBLICATION supabase_realtime ADD TABLE notifications`
- RLS: usuários veem apenas suas notificações; admins podem inserir para qualquer usuário

### Backend (trigger)
- Criar função SQL `notify_order_status_change()` que dispara ao atualizar `orders.status`
- Insere registro em `notifications` para o `user_id` do cliente do pedido com mensagem contextual ("Pedido confirmado!", "Saiu para entrega!", "Entregue!")
- Criar trigger `on_order_status_update` na tabela `orders` AFTER UPDATE

### Frontend
- Criar componente `NotificationBell` no header com badge de contagem de não lidas
- Criar dropdown/sheet `NotificationList` listando notificações recentes
- Usar `supabase.channel('notifications').on('postgres_changes', ...)` para escutar novas notificações em tempo real e mostrar toast automático
- Marcar como lida ao abrir o painel

---

## 2. Busca de Produtos e Filtros por Categoria

### Frontend (Index.tsx)
- Adicionar campo de busca (`Input` com ícone `Search`) acima da grade de produtos
- Adicionar botões de filtro por categoria: "Todos", "Gás", "Água", "Carvão"
- Filtrar `products` no `useMemo` por nome (busca) e categoria (filtro)
- Sem alterações no banco de dados

```text
[🔍 Buscar produto...                    ]
[Todos] [Gás] [Água] [Carvão]
┌──────┐ ┌──────┐ ┌──────┐
│Prod 1│ │Prod 2│ │Prod 3│
└──────┘ └──────┘ └──────┘
```

---

## 3. Histórico de Endereços

### Database
- Criar tabela `customer_addresses`: `id`, `customer_id` (FK customers), `label` (ex: "Casa", "Trabalho"), `address`, `neighborhood`, `city`, `state`, `latitude`, `longitude`, `is_default` (boolean), `created_at`
- RLS: usuários CRUD apenas seus endereços (via `customer_id` → `customers.user_id`)

### Frontend
- **CustomerRegistration**: Ao salvar endereço, também salvar em `customer_addresses`
- **CheckoutSheet**: Mostrar seletor de endereços salvos antes do campo de endereço manual, com opção "Usar outro endereço"
- **Perfil**: Listar endereços salvos com opção de editar, excluir ou definir como padrão

---

## Detalhes Técnicos

### Migrations necessárias

**Migration 1**: Tabela `notifications`
```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- Policies + Realtime
```

**Migration 2**: Trigger de notificação automática
```sql
CREATE FUNCTION notify_order_status_change() RETURNS trigger ...
CREATE TRIGGER on_order_status_update AFTER UPDATE OF status ON orders ...
```

**Migration 3**: Tabela `customer_addresses`
```sql
CREATE TABLE customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  label text DEFAULT 'Casa',
  address text NOT NULL,
  neighborhood text DEFAULT '',
  city text NOT NULL,
  state text NOT NULL,
  latitude double precision,
  longitude double precision,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
```

### Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `src/components/NotificationBell.tsx` | Criar - sino + badge + dropdown |
| `src/hooks/useNotifications.ts` | Criar - Realtime + query |
| `src/components/AddressSelector.tsx` | Criar - seletor de endereços |
| `src/pages/Index.tsx` | Modificar - busca + filtros + NotificationBell |
| `src/components/CheckoutSheet.tsx` | Modificar - seletor de endereço |
| `src/components/CustomerRegistration.tsx` | Modificar - salvar em customer_addresses |
| `src/components/admin/AdminOrders.tsx` | Sem mudanças (trigger cuida da notificação) |

### Ordem de implementação
1. Busca e filtros (mais simples, sem DB)
2. Histórico de endereços (migration + UI)
3. Notificações push (migration + trigger + Realtime + UI)

