// ------------- CONFIG -------------
const STRIPE_PK = 'pk_test_YOUR_PUBLISHABLE_KEY';   // ← replace with your real Stripe key later
const MENU = [
  {id:1,name:'Mac & Cheese',price:9.50,desc:'Creamy cheddar, crispy breadcrumb top.',img:'https://images.unsplash.com/photo-1623334044305-3e7a5f6d2b5f?auto=format&fit=crop&w=600&q=60'},
  {id:2,name:'Beef Chili Bowl',price:11.00,desc:'Slow-cooked beef, beans, cornbread.',img:'https://images.unsplash.com/photo-1606788169115-4f38a55ed9a1?auto=format&fit=crop&w=600&q=60'},
  {id:3,name:'Chicken Pot Pie',price:12.00,desc:'Flaky crust, hearty veg & gravy.',img:'https://images.unsplash.com/photo-1598214182421-98a757d38ce6?auto=format&fit=crop&w=600&q=60'},
  {id:4,name:'Pumpkin Soup',price:7.00,desc:'Roasted pumpkin, cream, nutmeg.',img:'https://images.unsplash.com/photo-1606788078372-5b5259d8e152?auto=format&fit=crop&w=600&q=60'},
  {id:5,name:'Apple Crumble',price:6.00,desc:'Cinnamon apples, oat topping.',img:'https://images.unsplash.com/photo-1562007908-859b4ba9a1a8?auto=format&fit=crop&w=600&q=60'}
];
// ------------- STATE -------------
let cart = [];
const stripe = Stripe(STRIPE_PK);
let cardElement;
// ------------- RENDER -------------
function renderMenu(){
  const container = document.getElementById('menu');
  container.innerHTML = MENU.map(item=>`
    <article class="item">
      <img src="${item.img}" alt="${item.name}">
      <h3>${item.name}</h3>
      <p>${item.desc}</p>
      <footer>
        <span>$${item.price.toFixed(2)}</span>
        <button class="add" data-id="${item.id}">Add</button>
      </footer>
    </article>`).join('');
}
function renderCart(){
  const list = document.getElementById('cart-list');
  const totalEl = document.getElementById('total');
  if(!cart.length){list.innerHTML='<li>Cart empty</li>';totalEl.textContent='';document.getElementById('checkout-btn').hidden=true;return;}
  list.innerHTML = cart.map(i=>`<li>${i.name} x${i.qty}<span>$${(i.price*i.qty).toFixed(2)}</span></li>`).join('');
  const total = cart.reduce((s,i)=>s+i.price*i.qty,0);
  totalEl.textContent = `Total: $${total.toFixed(2)}`;
  document.getElementById('checkout-btn').hidden=false;
}
// ------------- CART -------------
document.addEventListener('click',e=>{
  if(e.target.classList.contains('add')){
    const id = +e.target.dataset.id;
    const item = MENU.find(m=>m.id===id);
    const found = cart.find(c=>c.id===id);
    found ? found.qty++ : cart.push({...item,qty:1});
    renderCart();
  }
});
document.getElementById('checkout-btn').onclick = ()=>{
  document.getElementById('checkout').hidden = false;
  if(!cardElement){
    const elements = stripe.elements({locale:'en'});
    cardElement = elements.create('card',{hidePostalCode:false});
    cardElement.mount('#card-element');
  }
};
// ------------- MODE SWITCH -------------
document.querySelectorAll('input[name="mode"]').forEach(r=>r.onchange=e=>{
  document.getElementById('address-label').hidden = e.target.value==='pickup';
});
// ------------- SUBMIT -------------
document.getElementById('checkout').onsubmit = async(e)=>{
  e.preventDefault();
  const phone = document.getElementById('phone').value.trim();
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const address = document.getElementById('address').value.trim();
  if(mode==='delivery'&&!address){alert('Please enter delivery address');return;}
  const total = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const {paymentIntent,error} = await stripe.confirmCardPayment(
    await createPaymentIntent(total),
    {payment_method:{card:cardElement,billing_details:{phone}}}
  );
  if(error){document.getElementById('payment-error').textContent=error.message;return;}
  await fetch('/order',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({phone,mode,address,items:cart,amount:total,pi:paymentIntent.id})
  });
  document.getElementById('checkout').hidden=true;
  document.getElementById('success').hidden=false;
  cart=[];renderCart();
};
async function createPaymentIntent(amount){
  const res = await fetch('/create-payment-intent',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({amount:Math.round(amount*100)})
  });
  const {clientSecret} = await res.json();
  return clientSecret;
}
// ------------- INIT -------------
renderMenu();renderCart();
