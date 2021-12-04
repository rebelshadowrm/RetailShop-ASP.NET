//import Tabulator from 'https://unpkg.com/tabulator-tables@4.9.3/dist/js/tabulator.es2015.min.js';

//TODO: Ideally flesh out the cart class to hold CRUD functions.
class Cart {
    constructor(productId, quantity) {
        this.productId = productId;
        this.quantity = quantity;
    }
}

//defines property .clearChildren; clears all children
if( typeof Element.prototype.clearChildren === 'undefined' ) {
    Object.defineProperty(Element.prototype, 'clearChildren', {
       configurable: true,
       enumerable: false,
       value: function() {
         while(this.firstChild) this.removeChild(this.lastChild);
       }
     });
 }

 function convertToMoney(val){
    return (Math.floor(val*100).toFixed(0)/100).toFixed(2);
}

async function fetchJSON() {
    const response = await fetch('/js/storeData.json');
    if(!response.ok) {
        const message = `An error has occured: ${response.status}`;
        throw new Error(message);
    }
    const json = await response.json();
    return Promise.resolve(json);
}

document.addEventListener("DOMContentLoaded",  async () => {
    try {
        await getCartItems();

        
        const shopCheck = document.querySelector("#shop-container") ?? undefined;
        if(shopCheck) {
            await getShopItems();
            await setShopDetailsOnClick();
        }
        
        const checkoutCheck = document.querySelector("#checkout-cart-container") ?? undefined;
        if(checkoutCheck) {
            await lockCartToggle();
        } else {
            await setCartToggle();
        }
        
        const detailsCheck = document.querySelector("#item-details-container") ?? undefined;
        if(detailsCheck) {
            let id = window.location.pathname;
            id = id.replace("/Home/Details/", "");
            await itemDetailsPage(id);
        }
        
        await setObserver();

    } catch(err) {
        console.log(err.message);
    }
});

async function getCartItems() {
    try {
        let cartItems = await getCartItemsJSON(), cartContainer = document.querySelector(".cart-items");
        for (let index = 0; index < cartItems?.length; index++) {
            let prodId = cartItems[index].productId, json = await fetchJSON();
            if (await hasUniqueCartId(prodId)) {
                let item = json.filter(({ id }) => id === parseInt(prodId));
                cartContainer.appendChild(await createCartItem(item[0]));
            }
        }
        await updateCartBottom();
    } catch (err) {
        console.log(err.message);
    }
}

async function getShopItems() {
    try {
        let shopRowTemplate = document.querySelector("#shop-row"),
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
    } catch(err) {
        console.log(err.message);
    }
}
async function setShopDetailsOnClick() {
    const clickableShopItems = document.querySelectorAll(".shop-item");
    clickableShopItems.forEach(e => {
        let id = e.querySelector('.item-quantity-container').dataset.item;
        e.addEventListener('click', (e) => {
            let parent = e.target.parentElement.parentElement;
            //a check that prevents the modal from opening when .quantity-btn is clicked
            if(parent.querySelector(".quantity-btn")) {
                itemDetailsModal(id);
            }
        });
    });
}

async function lockCartToggle() {
    try {
        let cartBtn = document.querySelector("#toggleCart"),
            mobileCartBtn = document.querySelector("#toggleMobileCart"),
            cart = document.querySelector("#cart-container"),
            main = document.querySelector("main");
        cart?.classList.add("show");
        main?.classList.add("cartShow");
        cartBtn?.classList.add("disabled");
        mobileCartBtn?.classList.add("disabled");
    } catch(err) {
        console.log(err.message);
    }
}
async function setCartToggle() {
    try {
        const cartBtn = document.querySelector("#toggleCart"),
              mobileCartBtn = document.querySelector("#toggleMobileCart");
        mobileCartBtn.addEventListener('click', async () => {
            await toggleCart();
        });
        cartBtn.addEventListener('click', async ()=> {
            await toggleCart();
        });
    } catch(err) {
        console.log(err.message);
    }
}
async function toggleCart() {
    let cart = document.querySelector("#cart-container");
    let main = document.querySelector("main")
    cart?.classList.toggle("show");
    main?.classList.toggle("cartShow");
}

async function setObserver() {
    try {
        let observer = new MutationObserver(callback);
        observer.observe(document, {
            childList: true,
            attributes: true,
            subtree: true
        });
    } catch(err) {
        console.log(err.message);
    }
}
// add to cart / quantity buttons event handlers
async function callback(mutations) {  
    try {
        for (let mutation of mutations) {
            if (mutation.target.matches(".quantity-number")) {
                await updateQuantityNumber(mutation);
            }
        }
    } catch(err) {
        console.log(err.message);
    }
}
async function updateQuantityNumber(mutation) {
    try {
        let parent = mutation.target.parentElement.parentElement,
            changeQuantity = parent.querySelector(".change-quantity"),
            addToCart = parent.querySelector(".add-to-cart");
        if (parseInt(mutation.target.innerText) <= 0) {
            await updateRemoveBtn(changeQuantity, addToCart);
            if(parseInt(mutation.target.innerText) < 0) {
                mutation.target.innerText = 0;
            }
            await removeCartItem(parent.parentElement.dataset.item);
        } else if (parseInt(mutation.target.innerText) > 0) {
            console.log(changeQuantity)
            console.log(addToCart)
            await updateAddBtn(changeQuantity, addToCart);
        }
        await updateCartItemToStorage(parent.parentElement.dataset.item, mutation.target.innerText);
        await updateCartBottom();
    } catch(err) {
        console.log(err.message);
    }
}
//helper functions that act like more specific toggles
async function updateRemoveBtn(changeQuantity, addToCart) {
    try {
        changeQuantity.classList.add("hide");
        changeQuantity.classList.remove("show");
        addToCart.classList.add("show");
        addToCart.classList.remove("hide");
    } catch(err) {
        console.log(err.message);
    }
}
async function updateAddBtn(changeQuantity, addToCart) {
    try {
        changeQuantity.classList.add("show");
        changeQuantity.classList.remove("hide");
        addToCart.classList.add("hide");
        addToCart.classList.remove("show");
    } catch(err) {
        console.log(err.message);
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
    try {
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
    } catch(err) {
        console.log(err.message);
    }
}
async function quantityRemove(e) {
    try {
        let parent = e.target.parentElement.parentElement,
            quantity = parent.querySelector(".quantity-number");
        quantity.innerText--;
    } catch(err) {
        console.log(err.message);
    }
}
async function quantityAdd(e) {
    try {
        let parent = e.target.parentElement.parentElement,
            quantity = parent.querySelector(".quantity-number");
        quantity.innerText++;
    } catch(err) {
        console.log(err.message);
    }
}

async function updateCartBottom() {
    try {
        let quantityField = document.querySelector(".cart-quantity"),
        subtotalField = document.querySelector(".cart-subtotal"),
        taxesField = document.querySelector(".cart-taxes"),
        totalField = document.querySelector(".cart-total"),
        items = await getCartItemsJSON() ?? [],
        json = await fetchJSON(),
        quantity = 0,
        subtotal = 0,
        taxes = 0.07,
        total = 0,
        checkout = document.querySelector("#checkout-cart-container") ?? undefined;

        items?.forEach( e => {
            let item = json.filter( ({ id }) => id === parseInt(e.productId));
            item = item[0];
            quantity += parseInt(e.quantity, 10);
            subtotal += item.price * e.quantity;
        });
        taxes = subtotal * taxes;
        total = taxes + subtotal;
        if (quantityField.innerText != quantity) {
            if(parseInt(quantity) === 1) {
                quantityField.innerText = `(${quantity} item)`;
            } else {
                quantityField.innerText = `(${quantity} items)`;
            }
            subtotalField.innerText = `$${convertToMoney(subtotal)}`;
            taxesField.innerText = 'Calculated at checkout';
            totalField.innerText = 'See at checkout';
            if(checkout) {
            taxesField.innerText = `$${convertToMoney(taxes)}`;
            totalField.innerText = `$${convertToMoney(total)}`;
            }
        }
    } catch(err) {
        console.log(err.message);
    }
}

// creates each shop item for a category row
async function createShopRow(data, rowItemContainer) {
    try {
        for (let i = 0; i < data.length; i++) {
            let shopItemTemplate = document.querySelector("#shop-item"),
                itemClone = shopItemTemplate.content.cloneNode(true),
                image = itemClone.querySelector(".product-image"),
                title = itemClone.querySelector(".product-name"),
                rating = itemClone.querySelector(".Stars"),
                ratingCount = itemClone.querySelector(".rating-count"),
                price = itemClone.querySelector(".product-price");
                
            
            image.src=data[i].image;
            title.innerText = data[i].title;
            rating.style=`--rating: ${data[i].rating.rate}`;
            ratingCount.innerText=`(${data[i].rating.count})`;
            price.innerText = `$${data[i].price}`;
            
            let quantityContainer = itemClone.querySelector(".item-quantity-container"),
                quantityClone = await createQuantityBtn(data[i].id);
            quantityContainer.dataset.item=data[i].id;
                
            quantityContainer.append(quantityClone);
            rowItemContainer.append(itemClone);               
        };
    } catch(err) {
        console.log(err.message);
    }
}

async function createQuantityBtn(id) {
    let quantityTemplate = document.querySelector("#quantitiy-btn"),
        quantityClone = quantityTemplate.content.cloneNode(true),
        quantityNumber = quantityClone.querySelector(".quantity-number"),
        changeQuantity = quantityClone.querySelector(".change-quantity"),
        addToCart = quantityClone.querySelector(".add-to-cart"),
        cartItems = await getCartItemsJSON(),
        item = cartItems?.filter( ({ productId }) => productId === id.toString()) ?? [];

    quantityNumber.innerText = item[0]?.quantity ?? 0;

    if (parseInt(quantityNumber.innerText) <= 0) {
        changeQuantity.classList.add("hide");
        changeQuantity.classList.remove("show");
        quantityNumber.innerText = 0;
    } else {
        addToCart.classList.add("hide");
        addToCart.classList.remove("show");
    }   
    return Promise.resolve(quantityClone);
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

    let cartQuantityContainer = cartItemClone.querySelector(".cart-item-quantity");
    let quantityClone = await createQuantityBtn(json.id)
    cartQuantityContainer.dataset.item=json.id;
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

async function updated(productId) {
    try {
    const event = new CustomEvent("cartUpdated",
    {"bubbles": true, "cancelable": false, detail: { id: productId } 
    });
    document.dispatchEvent(event);
    } catch(err) {
        console.log(err.message);
    }
}
window.addEventListener("cartUpdated", async (event) => {
    try {
        let id = event.detail.id;
        let json = await getCartItemsJSON();
        let item = json.filter( ({ productId }) => productId === id.toString());

        let shopItemContainer = document.querySelector(`.item-quantity-container[data-item="${id}"]`);
        let shopItemQuantity = shopItemContainer?.querySelector(`.quantity-number`);

        let cartItemContainer = document.querySelector(`.cart-item-quantity[data-item="${id}"]`);
        let cartItemQuantity = cartItemContainer?.querySelector(`.quantity-number`);

        let itemDetailsContainer = document.querySelector(`.item-details-quantity-container[data-item="${id}"]`);
        let itemDetailsQuantity = itemDetailsContainer?.querySelector(`.quantity-number`);

        let quantity = item[0]?.quantity ?? 0;
        let shopQuantity = shopItemQuantity?.innerText ?? 0;
        let cartQuantity = cartItemQuantity?.innerText ?? 0;
        let detailQuantity = itemDetailsQuantity?.innerText ?? cartQuantity;

        console.log(`shop: ${shopQuantity}`);
        console.log(`cart: ${cartQuantity}`)
        console.log(`detail: ${detailQuantity}`)

        if (shopQuantity != cartQuantity   ||
            shopQuantity != detailQuantity ||
            cartQuantity != detailQuantity ) {
                if(shopItemQuantity) shopItemQuantity.innerText = quantity;
                if(cartItemQuantity) cartItemQuantity.innerText = quantity;
                if(itemDetailsQuantity) itemDetailsQuantity.innerText = quantity;
            }
    } catch(err) {
        console.log(err.message);
    }
}, false);

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
        await updated(productId);
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
    await updated(id); 
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
            await updated(productId);
            cartItem?.remove();
        }
    } catch(err) {
        console.log(err.message);
    }
}

async function itemDetailsPage(productId) {
    try {
        let detailPageContainer = document.querySelector("#item-details-container"),
            detailPageTemplate = document.querySelector("#detail-page-template"),
            detailPageClone = detailPageTemplate.content.cloneNode(true),
            image = detailPageClone.querySelector(".main-image"),
            itemCardContainer = detailPageClone.querySelector(".item-card-container"),
            itemDescriptionContainer = detailPageClone.querySelector(".item-description-container"),
            itemSpecsContainer = detailPageClone.querySelector(".item-specs-container"),
            json = await fetchJSON(),
            item = json?.filter( ({ id }) => id === parseInt(productId)) ?? [];

        item = item[0];
        image.style.backgroundImage = `url('${item.image}')`;


        let itemCardTemplate = document.querySelector("#item-card-template"),
            itemCardClone = itemCardTemplate.content.cloneNode(true),
            name = itemCardClone.querySelector(".item-name"),
            price = itemCardClone.querySelector(".item-price"),
            itemQuantityContainer = itemCardClone.querySelector(".item-quantity-container");

        let quantityClone = await createQuantityBtn(item.id);
        itemQuantityContainer.dataset.item=item.id;
        itemQuantityContainer.append(quantityClone);

        name.innerText = item.title;
        price.innerText = item.price;
        itemCardContainer.append(itemCardClone);
        detailPageContainer.append(detailPageClone);

        //item description tab
        let itemDescriptionTemplate = document.querySelector("#item-description-template"),
            itemDescriptionClone = itemDescriptionTemplate.content.cloneNode(true),
            itemDescription = itemDescriptionClone.querySelector(".item-description");

        itemDescription.innerText = item.description;
        itemDescriptionContainer.append(itemDescriptionClone);

        //item comments tab
        let comments = await getAllCommentsByProductId(productId);
        await createComments(comments);

        //item specs tab
        let itemSpecsTemplate = document.querySelector("#item-specs-template"),
            itemSpecsClone = itemSpecsTemplate.content.cloneNode(true);
        itemSpecsContainer.append(itemSpecsClone);

        


    } catch (err) {
        console.log(err.message);
    }
}

//Item details modal
async function itemDetailsModal(id) {
    try {
        const modal = document.querySelector("#modal-container");
        modal.classList.add("show");
        window.onclick = function (event) {
            if (event.target == modal) {
                modal.classList.remove("show");
            }
        };
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
        detailsPrice = detailsClone.querySelector(".item-details-price"),
        moreDetailsLink= detailsClone.querySelector(".more-details-link");

    let json = await fetchJSON(),
        item = json?.filter( ({ id }) => id === parseInt(productId)) ?? [];
    item = item[0];
    
    detailsName.innerText=item.title;
    detailsImage.style.backgroundImage = `url('..${item.image}')`;
    detailsDescription.innerText=item.description;
    detailsPrice.innerText=item.price;

    moreDetailsLink.href = `/Home/Details/${item.id}`;

    let quantityContainer = detailsClone.querySelector(".item-details-quantity-container"),
        quantityClone = await createQuantityBtn(productId);
    quantityContainer.dataset.item=productId;
    quantityContainer.append(quantityClone);

    modalContainer.clearChildren();
    modalContainer.append(detailsClone);
    } catch(err) {
        console.log(err.message);
    }
}

async function getAllCommentsByProductId(id) {
    try {
        const response = await fetch('/api/comments');
        if(!response.ok) {
            const message = `An error has occured: ${response.status}`;
            throw new Error(message);
        }
        const json = await response.json();
        const items = json.filter( ({ productId }) => productId === parseInt(id));
        return Promise.resolve(items);
    } catch(err) {
        console.log(err.message);
    }
}

async function createComments(comments) {
    try {
        for (let i = 0; i < comments?.length; i++) {
            await createComment(comments[i]);
        }
    } catch(err) {
        console.log(err.message);
    }
}

async function createComment(comment) {
    try {
        let itemCommentContainer = document.querySelector(".item-comment-container"),
            itemCommentTemplate = document.querySelector("#item-comment-template"),
            itemCommentClone = itemCommentTemplate.content.cloneNode(true),
            commentName = itemCommentClone.querySelector(".comment-name"),
            commentUser = itemCommentClone.querySelector(".user-name"),
            commentRating = itemCommentClone.querySelector(".Stars"),
            commentBody = itemCommentClone.querySelector(".comment-body");

        commentName.innerText = comment?.title;
        commentUser.innerText = comment?.author;
        commentRating.style = `--rating: ${comment?.rating}`;
        commentBody.innerText = comment?.body;

        itemCommentContainer.append(itemCommentClone);
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





