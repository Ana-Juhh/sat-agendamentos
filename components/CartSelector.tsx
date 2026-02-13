import { ShoppingCart } from 'lucide-react'


const carts = [
{ id: 1, label: 'Carrinho 1 – Corredor Salas 5–10' },
{ id: 2, label: 'Carrinho 2 – Corredor Salas 5–10' },
{ id: 3, label: 'Carrinho 3 – Corredor Salas 11–14' },
{ id: 4, label: 'Carrinho 4 – Corredor Salas 11–14' },
]


export default function CartSelector() {
return (
<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
{carts.map(cart => (
<div key={cart.id} className="border rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:bg-gray-50">
<ShoppingCart size={36} />
<span className="text-center font-medium">{cart.label}</span>
</div>
))}
</div>
)
}