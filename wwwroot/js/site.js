//import Tabulator from 'https://unpkg.com/tabulator-tables@4.9.3/dist/js/tabulator.es2015.min.js';

class Cart {
    constructor(productId, quantity) {
        this.productId = productId;
        this.quantity = quantity;
    }
}

document.addEventListener("DOMContentLoaded",  async () => {
    try {
        const   shopRowTemplate = document.querySelector("#shop-row"),
                shopContainer = document.querySelector("#shop-container"),
                data = await fetchJSON(),
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
        const shop = document.querySelector("#shop-container");
        const shopQuantityNode = shop.querySelectorAll(".quantity-number");
        const shopObserverOptions = {
            childList: true,
            attributes: true,
            subtree: false
        }
        shopQuantityNode.forEach( e => {
            let observer = new MutationObserver(showHide);
            observer.observe(e, shopObserverOptions);
        });


        await getCartItems();

        //observer for every time the cart changes
        const cart = document.querySelector("#cart-container");
        const cartObserverOptions = {
            childList: true,
            attributes: true,
            subtree: true
        }
        //calls cartQuantityObserver every time cart updates
        let observer = new MutationObserver(cartQuantityObserver);
        observer.observe(cart, cartObserverOptions);

        const clickableShopItems = document.querySelectorAll(".shop-item");
        clickableShopItems.forEach(e => {
            let id = e.querySelector('.item-quantity-container').dataset.item;
            e.addEventListener('click', (e) => {
                let parent = e.target.parentElement.parentElement;
                //call modal
                console.log(parent);
                if(parent.querySelector(".quantity-btn")) {
                itemDetailsModal(id);
                }
            });
        });


    } catch(err) {
        console.log(err.message);
    }
});

//clears all children
if( typeof Element.prototype.clearChildren === 'undefined' ) {
    Object.defineProperty(Element.prototype, 'clearChildren', {
       configurable: true,
       enumerable: false,
       value: function() {
         while(this.firstChild) this.removeChild(this.lastChild);
       }
     });
 }

async function fetchJSON() {
    const response = await fetch('./js/storeData.json');
    if(!response.ok) {
        const message = `An error has occured: ${response.status}`;
        throw new Error(message);
    }
    const json = await response.json();
    return Promise.resolve(json);
}

//attaches new observer to the cart
async function cartQuantityObserver(mutations) {
    const cart = document.querySelector("#cart-container");
    const cartQuantityNode = cart.querySelectorAll(".quantity-number");
    const cartObserverOptions = {
        childList: true,
        attributes: true,
        subtree: true
    }
    cartQuantityNode.forEach( e => {
        let observer = new MutationObserver(showHide);
        observer.observe(e, cartObserverOptions);
    });
}

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
                removeCartItem(parent.parentElement.dataset.item);
            } else if (parseInt(mutation.target.innerText) > 0) {
                changeQuantity.classList.add("show");
                changeQuantity.classList.remove("hide");
                addToCart.classList.add("hide");
                addToCart.classList.remove("show");
            }
            updateQuantity(parent.parentElement.dataset.item, mutation.target.innerText);
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

    let cartQuantityContainer = cartItemClone.querySelector(".cart-item-quantity"),
        quantityTemplate = document.querySelector("#quantitiy-btn"),
        quantityClone = quantityTemplate.content.cloneNode(true),
        quantityNumber = quantityClone.querySelector(".quantity-number"),
        changeQuantity = quantityClone.querySelector(".change-quantity"),
        addToCart = quantityClone.querySelector(".add-to-cart"),
        cartItems = await getCartItemsJSON(),
        item = cartItems.filter( ({ productId }) => productId === json.id.toString());

    quantityNumber.innerText = item[0]?.quantity ?? 0;
    cartQuantityContainer.dataset.item=json.id;

    if (parseInt(quantityNumber.innerText) <= 0) {
        changeQuantity.classList.add("hide");
        changeQuantity.classList.remove("show");
        quantityNumber.innerText="0";
    } else {
        addToCart.classList.add("hide");
        addToCart.classList.remove("show");
    }   
    cartQuantityContainer.append(quantityClone);
    
    return Promise.resolve(cartItemClone);
}

async function getUniqueCategories(data) {
    let arr = [];
    Object.keys(data).forEach(key => {
        arr.push(data[key].category);
    });
    return Promise.resolve(Array.from(new Set(arr)));
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

async function updateQuantity(id, quantity) {
    try {    
        let shopItemContainer = document.querySelector(`.item-quantity-container[data-item="${id}"]`);
        let shopItemQuantity = shopItemContainer?.querySelector(`.quantity-number`);

        let cartItemContainer = document.querySelector(`.cart-item-quantity[data-item="${id}"]`);
        let cartItemQuantity = cartItemContainer?.querySelector(`.quantity-number`);

        let shopQuantity = shopItemQuantity?.innerText ?? 0;
        let cartQuantity = cartItemQuantity?.innerText ?? 0;

        if ( shopQuantity != cartQuantity) {
            await updateCartItemToStorage(id, quantity);
            shopItemQuantity.innerText = quantity;
            cartItemQuantity.innerText = quantity;
        }
    } catch(err) {
        console.log(err.message);
    }
}

const getCartItems = async () => {
    try {
        let cartItems = await getCartItemsJSON(),
            cartContainer = document.querySelector(".cart-items");
        for (let index = 0; index < cartItems?.length; index++) {
            let prodId = cartItems[index].productId,
                json = await fetchJSON();
            if(await hasUniqueCartId(prodId)) {
                let item = json.filter( ({ id }) => id === parseInt(prodId));
                cartContainer.appendChild(await createCartItem(item[0]));
            }
        }
    } catch (err) {
        console.log(err.message);
    }
}

async function addCartItemToCart(productId) {
    try {
        let cartContainer = document.querySelector(".cart-items"),
            json = await fetchJSON(),
            item = json.filter( ({ id }) => id === parseInt(productId));

        cartContainer.appendChild(await createCartItem(item[0]));
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

async function updateCartItemToStorage(id, quantity) {
    try {
    let items = await getCartItemsJSON() ?? [];
    if(items?.some( e => e.productId === id.toString())) {
        let obj = items.find(e => e.productId == id);
        let index = items.indexOf(obj);
        items.fill(obj.quantity=quantity, index, index++);
    }
    await setCartItemsJSON(items); 
    } catch (err) {
        console.log(err.message);
    }
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


//Item details modal
const itemDetailsModal = async (id) => {
    try {
        const modal = document.querySelector("#modal-container");
        modal.classList.add("show");
        window.onclick = function(event) {
            if (event.target == modal) {
              modal.classList.remove("show");
            }
        }
        await createDetailModal(id);

    } catch (err) {
        console.log(err.message);
    }
}

async function createDetailModal(productId) {
    try {
    let detailsTemplate = document.querySelector("#item-details-template"),
        modalContainer = document.querySelector("#modal-container"),
        detailsClone = detailsTemplate.content.cloneNode(true),
        detailsName = detailsClone.querySelector(".item-details-name"),
        detailsImage = detailsClone.querySelector(".item-details-image"),
        detailsDescription = detailsClone.querySelector(".item-details-description"),
        detailsPrice = detailsClone.querySelector(".item-details-price");

    let json = await fetchJSON();
    let item = json.filter( ({ id }) => id === parseInt(productId)) ?? [];
    item = item[0];
    
    detailsName.innerText=item.title;
    detailsImage.src="";
    detailsImage.style.backgroundImage = `url(${item.image})`;
    detailsDescription.innerText=item.description;
    detailsPrice.innerText=item.price;

    modalContainer.clearChildren();
    modalContainer.append(detailsClone);


    } catch(err) {
        console.log(err.message);
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





