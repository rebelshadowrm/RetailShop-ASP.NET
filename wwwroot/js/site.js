import Tabulator from 'https://unpkg.com/tabulator-tables@4.9.3/dist/js/tabulator.es2015.min.js';
const shopAPI = 'https://fakestoreapi.com/products';

class Cart {
    constructor(productId, quantity) {
        this.productId = productId;
        this.quantity = quantity;
    }
}

document.addEventListener("DOMContentLoaded",  async () => {
    try {
        getCartItems();
        const   shopRowTemplate = document.querySelector("#shop-row"),
                shopContainer = document.querySelector("#shop-container"),
                data = await fetchJSON(shopAPI),
                unique = await getUniqueCategories(data);

        for (let index = 0; index < unique.length; index++) {
            let rowClone = shopRowTemplate.content.cloneNode(true),
                category = rowClone.querySelector(".product-type");
            
            category.innerText = unique[index];
            let rowItemContainer = rowClone.querySelector(".row-items"),
                itemsInCategory = data.filter( ({ category }) => category === unique[index]);
            
            await createShopRow(itemsInCategory, rowItemContainer);
            shopContainer.appendChild(rowClone);  
        }

        //Observer for add to cart / quantity buttons
        const quantityNode = document.querySelectorAll(".quantity-number");
        const observerOptions = {
            childList: true,
            attributes: true,
            subtree: false
        }
        quantityNode.forEach( e => {
            let observer = new MutationObserver(showHide);
            observer.observe(e, observerOptions);
        });

        //TODO: make another observer for the cart
    } catch(err) {
        console.log(err.message);
    }
});

// Update cart item quantity
// async function cartItemQuantityUpdate(cartItem, newQuantity) {
//     try {
//         let cart = await getCartItems();
//         let cartItemIndex = cart.findIndex(item => item.productId === cartItem.productId);
//         cart[cartItemIndex].quantity = newQuantity;
//         await setCartItems(cart);
//     } catch(err) {
//         console.log(err.message);
//     }
// }



// add to cart / quantity buttons event handlers
async function showHide(mutations) {  
    for (let mutation of mutations) {
        if (mutation.target.matches(".quantity-number")) {
            let parent = mutation.target.parentElement.parentElement;
            let changeQuantity = parent.querySelector(".change-quantity");
            let addToCart = parent.querySelector(".add-to-cart");
            if (parseInt(mutation.target.innerText) <= 0) {
                changeQuantity.classList.add("hide");
                changeQuantity.classList.remove("show");
                addToCart.classList.add("show");
                addToCart.classList.remove("hide");
                if(parseInt(mutation.target.innerText) < 0) {
                    mutation.target.innerText = 0;
                }
                //reload cart call to reflect item removed
                removeCartItem(parent.parentElement.dataset.item);
            } else if (parseInt(mutation.target.innerText) > 0) {
                changeQuantity.classList.add("show");
                changeQuantity.classList.remove("hide");
                addToCart.classList.add("hide");
                addToCart.classList.remove("show");
            }
        }
    }
}

// toggle cart btn
const cartBtn = document.querySelector("#toggleCart");
cartBtn.addEventListener('click', async ()=> {
    await toggleCart();
});
async function toggleCart() {
    let cart = document.querySelector("#cart-container");
    let shop = document.querySelector("#shop-container")
    cart.classList.toggle("show");
    shop.classList.toggle("cartShow")
}

// creates each shop item for a category row
async function createShopRow(data, rowItemContainer) {
    const shopItemTemplate = document.querySelector("#shop-item"),
          quantityTemplate = document.querySelector("#quantitiy-btn"),
          items = await getCartItemsJSON();

    data.forEach(e => {
        let itemClone = shopItemTemplate.content.cloneNode(true),
            image = itemClone.querySelector(".product-image"),
            title = itemClone.querySelector(".product-name"),
            rating = itemClone.querySelector(".Stars"),
            ratingCount = itemClone.querySelector(".rating-count"),
            price = itemClone.querySelector(".product-price"),
            quantityContainer = itemClone.querySelector(".item-quantity-container");
        
        image.src=e.image;
        title.innerText = e.title;
        rating.style=`--rating: ${e.rating.rate}`;
        ratingCount.innerText=`(${e.rating.count})`;
        price.innerText = `$${e.price}`;
        quantityContainer.dataset.item=e.id;
        
        let quantityClone = quantityTemplate.content.cloneNode(true);
            
        quantityContainer.appendChild(quantityClone);
        rowItemContainer.appendChild(itemClone);

        let find = items?.find( ({ productId }) => productId === e.id.toString()),
            number = quantityContainer.querySelector(".quantity-number"),
            changeQuantity = quantityContainer.querySelector(".change-quantity"),
            addToCart = quantityContainer.querySelector(".add-to-cart");

        number.innerText=find?.quantity ?? 0;
        if (parseInt(number.innerText) <= 0) {
            changeQuantity.classList.add("hide");
            changeQuantity.classList.remove("show");
            number.innerText="0";
        } else {
            addToCart.classList.add("hide");
            addToCart.classList.remove("show");
        }                    
    });
}


// listen for add-to-cart / - and + quantity btn clicks
document.addEventListener('click', async (event) => {
    try {
        if (event.target.matches('.cart-add')) {
            await addToCart(event);
        }
        if (event.target.matches('.quantity-add')) {
            await quantityAdd(event);
        }
        if (event.target.matches('.quantity-remove')) {
            await quantityRemove(event);
        }
        return;
    } catch (err) {
        console.log(err.message);
    }
}, false);



async function addToCart(e) {
    let parent = e.target.parentElement.parentElement,
        quantity = parent.querySelector(".quantity-number"),
        cart = document.querySelector("#cart-container"),
        productId = parent.parentElement.dataset.item;

    await addCartItemToStorage(productId);
    await addCartItemToCart(productId);
    
    //perhaps not the most efficient, kind of slow
    //await the item to be added before updating the view
    //this prevents the user from being able to delete the item before it's added

    quantity.innerText++;
    if(!cart.classList.contains("show")) {
        toggleCart();
    };
}

async function quantityRemove(e) {
    let parent = e.target.parentElement.parentElement;
    let quantity = parent.querySelector(".quantity-number");
    quantity.innerText--;
    //TODO: update cart call (perhaps just a local storage change)
}

async function quantityAdd(e) {
    let parent = e.target.parentElement.parentElement;
    let quantity = parent.querySelector(".quantity-number");
    quantity.innerText++;
    //TODO: update cart call (perhaps just a local storage change)
}


const getCartItems = async () => {
    try {
        let cartItems = await getCartItemsJSON(),
            cartContainer = document.querySelector(".cart-items");
        for (let index = 0; index < cartItems?.length; index++) {
            let prodId = cartItems[index].productId,
                json = await fetchJSON(`${shopAPI}/${prodId}`);
            if(await hasUniqueCartId(prodId)) {
                cartContainer.appendChild(await createCartItem(json));
            }
        }
    } catch (err) {
        console.log(err.message);
    }
}

async function createCartItem(json) {
    let cartItemTemplate = document.querySelector("#cart-item"),
        cartItemClone = cartItemTemplate.content.cloneNode(true),
        cartItemImage = cartItemClone.querySelector(".cart-item-image"),
        cartItemName = cartItemClone.querySelector(".cart-item-name"),
        cartItemPrice = cartItemClone.querySelector(".cart-item-price"),
        cartItem = cartItemClone.querySelector(".cart-item");

    cartItemImage.src=json.image;
    cartItemName.innerText=json.title;
    cartItemPrice.innerText=json.price;
    cartItem.dataset.item=json.id;

    return Promise.resolve(cartItemClone);
}

async function addCartItemToCart(productId) {
    try {
        let cartContainer = document.querySelector(".cart-items"),
            json = await fetchJSON(`${shopAPI}/${productId}`);
        cartContainer.appendChild(await createCartItem(json));
    } catch(err) {
        console.log(err.message);
    }
}


async function addCartItemToStorage(productId) {
    try {
        let items = await getCartItemsJSON() ?? [];
        if(!items?.some( e => e.productId === productId.toString())) {
            items.push(new Cart(productId, "1"));
        } 
        await setCartItemsJSON(items);
    }catch(err) {
        console.log(err.message);
    }
}

async function removeCartItem(productId) {
    try {
        let cart = document.querySelector(".cart-items"),
            cartItem = cart.querySelector(`[data-item="${productId}"]`),
            items = await getCartItemsJSON() ?? [];
        if(items.some( e => e.productId === productId.toString())) {
            let index = items.map(e => e.productId).indexOf(productId);
            items.splice(index, 1);
            await setCartItemsJSON(items);
            cartItem?.remove();
        }
    } catch(err) {
        console.log(err.message);
    }
}


//TODO: properly switch to async/await functions and establish proper promises/reponses.
async function fetchJSON(url) {
    const response = await fetch(url);
    if(!response.ok) {
        const message = `An error has occured: ${response.status}`;
        throw new Error(message);
    }
    const json = await response.json();
    return Promise.resolve(json);
}

async function getUniqueCategories(data) {
    let arr = [];
    Object.keys(data).forEach(key => {
        arr.push(data[key].category);
    });
    return Promise.resolve(Array.from(new Set(arr)));
}

async function getCartItemsJSON() {
    let storage = localStorage.getItem("cartItems");
    let cartItems = JSON.parse(storage);
    return Promise.resolve(cartItems);
}
async function setCartItemsJSON(items) {
    let storage = JSON.stringify(items);
    localStorage.setItem("cartItems", storage);
    return Promise.resolve("Cart updated");
}

async function hasUniqueCartId(id) {
    let items = document.querySelectorAll(".cart-item");
    let i = [];
    items.forEach(e => {
        i.push(e.dataset.item)
    });
    let unique = Array.from(new Set(i));
    if((unique.find(element => element === id) === undefined)) {
        return Promise.resolve(true);
    }
}


// // table

// var table = new Tabulator("#shop", {
//     ajaxURL: shopAPI,
//     layout: "fitDataFill",
//     autoResize: true,
//     resizableColumns: false,
//     resizableRows: false,
//     responsiveLayout: "collapse",
//     maxHeight: "100%",
//     headerVisible: false, //hide header
//     columns: [
//         {
//             title: "image", field: "image", formatter: "image", function(cell, formatterParams) {
//                 return `<img src="${cell.getValue()}" >`
//             }, width:200, variableHeight: true, responsive:0
//         },
//         { title: "title", field: "title", responsive: 1 },
//         { title: "category", field: "category", responsive: 2 },
//         { title: "description", field: "description", formatter: "textarea", responsive: 0, width:300 },
//         { title: "price", field: "price", formatter: "money", responsive: 3 },
        
//     ],
// });

//Code that can be used after checkout, to delete all items in the cart.

//clears cart of items before creating new cart items
// if( typeof Element.prototype.clearChildren === 'undefined' ) {
//     Object.defineProperty(Element.prototype, 'clearChildren', {
//       configurable: true,
//       enumerable: false,
//       value: function() {
//         while(this.firstChild) this.removeChild(this.lastChild);
//       }
//     });
// }
// cartContainer.clearChildren();