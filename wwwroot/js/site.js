import Tabulator from 'https://unpkg.com/tabulator-tables@4.9.3/dist/js/tabulator.es2015.min.js';
const shopAPI = 'https://fakestoreapi.com/products';

class Cart {
    constructor(productId, quantity) {
        this.productId = productId;
        this.quantity = quantity;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    //fetch all products 
    var url = shopAPI,
        options = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    };

    fetch(url, options).then(handleResponse)
        .then(handleData)
        .catch(handleError);

    function handleResponse(response) {
        return response.json().then(function (json) {
            return response.ok ? json : Promise.reject(json);
        });
    }

    function handleError(error) {
        console.error(error);
    }

    function handleData(data) {
        //shop properties
        console.log(data);


        //generate shop
        const   shopRowTemplate = document.querySelector("#shop-row"),
                shopItemTemplate = document.querySelector("#shop-item"),
                shopContainer = document.querySelector("#shop-container"),
                quantityTemplate = document.querySelector("#quantitiy-btn");
              

        //get list of categories and remove duplicates
        let arr = [];
        Object.keys(data).forEach(key => {
            arr.push(data[key].category);
        });
        let unique = Array.from(new Set(arr));
        unique.forEach(e => {
            let rowClone = shopRowTemplate.content.cloneNode(true);
            let category = rowClone.querySelector(".product-type");
            category.innerText = e;
            let rowItemContainer = rowClone.querySelector(".row-items");

            data.forEach(elem => {
                let itemImage = elem.image,
                itemCategory = elem.category,
                itemTitle = elem.title,
                itemPrice = elem.price,
                itemRating = elem.rating,
                itemDescription = elem.description,
                itemId = elem.id;
                if(itemCategory === e) {
                    let itemClone = shopItemTemplate.content.cloneNode(true);
        
                    let image = itemClone.querySelector(".product-image");
                    if(image === null) {
                        image.style.display='none';
                    } else {
                        image.src=itemImage;
                    }
                    let title = itemClone.querySelector(".product-name");
                    title.innerText = itemTitle;
                    let rating = itemClone.querySelector(".Stars");
                    rating.style=`--rating: ${itemRating.rate}`;
                    let ratingCount = itemClone.querySelector(".rating-count")
                    ratingCount.innerText=`(${itemRating.count})`;
                    let price = itemClone.querySelector(".product-price");
                    price.innerText = `$${itemPrice}`;
                    let quantityContainer = itemClone.querySelector(".item-quantity-container")
                    let quantityClone = quantityTemplate.content.cloneNode(true);
                    quantityContainer.dataset.item=itemId;
                    quantityContainer.appendChild(quantityClone);
                    rowItemContainer.appendChild(itemClone);

                    //set item quantity values to reflect localStorage
                    let storage = localStorage.getItem("cartItems");
                    let items = JSON.parse(storage);
                    let find = items.find( ({ productId }) => productId === itemId.toString());
                    let number = quantityContainer.querySelector(".quantity-number");
                    number.innerText=find?.quantity ?? 0;
                }
            shopContainer.appendChild(rowClone);                   
            });
        });

        //set initial show/hide states
        let quantityBtn = document.querySelectorAll(".quantity-btn");
        quantityBtn.forEach(e => {
            let quantity = e.querySelector(".quantity-number");
            let changeQuantity = e.querySelector(".change-quantity");
            let addToCart = e.querySelector(".add-to-cart");
            if (parseInt(quantity.innerText) <= 0) {
                changeQuantity.classList.add("hide");
                changeQuantity.classList.remove("show");
                quantity.innerText="0";
            } else {
                addToCart.classList.add("hide");
                addToCart.classList.remove("show");
            }
        });
        

        //testCart();
        getCartItems();

        const quantityNode = document.querySelectorAll(".quantity-number");
        const observerOptions = {
            childList: true,
            attributes: true,
            subtree: false
        }
        quantityNode.forEach( e => {
            let observer = new MutationObserver(showHide);
            observer.observe(e, observerOptions);
        })
    }




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

    document.addEventListener('click', function (event) {
        if (event.target.matches('.cart-add')) {
            addToCart(event);
        }
        if (event.target.matches('.quantity-add')) {
            quantityAdd(event);
        }
        if (event.target.matches('.quantity-remove')) {
            quantityRemove(event);
        }
        return
    }, false);



    async function addToCart(e) {
        let parent = e.target.parentElement.parentElement;
        let quantity = parent.querySelector(".quantity-number");
        let cart = document.querySelector("#cart-container");
        let productId = parent.parentElement.dataset.item;
        quantity.innerText++;
        if(!cart.classList.contains("show")) {
            toggleCart();
        };
        addCartItem(productId, quantity.innerText);

        //perhaps not the most efficient
        getCartItems();
    }

    async function quantityRemove(e) {
        let parent = e.target.parentElement.parentElement;
        let quantity = parent.querySelector(".quantity-number");
        quantity.innerText--;
        //update cart call (perhaps just a local storage change)
    }

    async function quantityAdd(e) {
        let parent = e.target.parentElement.parentElement;
        let quantity = parent.querySelector(".quantity-number");
        quantity.innerText++;
        //update cart call (perhaps just a local storage change)
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

});

//seeded cart for example
// var testCart = function() {
//     fetch('https://fakestoreapi.com/carts/5')
//             .then(res=>res.json())
//             .then(json=>{
//                 let data = json.products;
//                 let items = [];
//                 data.forEach(e => {
//                     items.push(new Cart(e.productId, e.quantity));
//                 })
//                 localStorage.setItem('cartItems', JSON.stringify(items));
//             })
// }


//checkout toggle

async function toggleCart() {
    let cart = document.querySelector("#cart-container");
    let shop = document.querySelector("#shop-container")
    cart.classList.toggle("show");
    shop.classList.toggle("cartShow")
}
const cartBtn = document.querySelector("#toggleCart");
cartBtn.addEventListener('click', ()=> {
    toggleCart();
});

//cart items
async function getCartItems() {

    //grab items from localstorage
    //this will be eventually replaced with some kind of fetch
    //so that data can be obtained from db
    let storage = localStorage.getItem("cartItems");
    let cartItems = JSON.parse(storage);

    //define container and template
    const cartContainer = document.querySelector(".cart-items");
    const cartItemTemplate = document.querySelector("#cart-item");

    
    if(cartItems) {
        cartItems.forEach(elem => {
            //get cart item information via API
            fetch(`https://fakestoreapi.com/products/${elem.productId}`)
            .then(res=>res.json())
            .then(json=> {
                //clone new cart item and insert cart item into template
                let cartItemClone = cartItemTemplate.content.cloneNode(true);
                let cartItemImage = cartItemClone.querySelector(".cart-item-image"),
                    cartItemName = cartItemClone.querySelector(".cart-item-name"),
                    cartItemPrice = cartItemClone.querySelector(".cart-item-price"),
                    cartItem = cartItemClone.querySelector(".cart-item");

                cartItemImage.src=json.image;
                cartItemName.innerText=json.title;
                cartItemPrice.innerText=json.price;
                cartItem.dataset.item=json.id;

                let items = document.querySelectorAll(".cart-item");
                let i = [];
                items.forEach(e => {
                    i.push(e.dataset.item)
                });
                let unique = Array.from(new Set(i));
                if((unique.find(element => element === elem.productId) === undefined)) {
                    cartContainer.appendChild(cartItemClone);
                }
            });
        });
    }
}

async function addCartItem(productId, quantity) {
    let items = [];
    let get = localStorage.getItem("cartItems");
    if(get) {
        let id = productId;
        items = JSON.parse(get); 
        let find = items.find( ({ productId }) => productId === id)
        if(!find) {
            items.push(new Cart(id, quantity));
        }
    } else {
        items = [
            {productId, quantity},
        ]
    }
    let storage = JSON.stringify(items);
    localStorage.setItem("cartItems", storage);
}

async function removeCartItem(productId) {
    let cart = document.querySelector(".cart-items");
    let cartItem = cart.querySelector(`[data-item="${productId}"]`);
    if(cartItem) {
        let get = localStorage.getItem("cartItems");
        let items = [];
        if(get) {
            let id = productId;
            items = JSON.parse(get);
            let find = items.find( ({ productId }) => productId === id);
            if(find) {
                let index = items.map(e => e.productId).indexOf(productId);
                items.splice(index, 1);
                localStorage.setItem("cartItems", JSON.stringify(items));
                cartItem.remove();
            }
        }
    }
}
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

