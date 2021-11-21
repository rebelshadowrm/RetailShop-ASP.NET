import Tabulator from 'https://unpkg.com/tabulator-tables@4.9.3/dist/js/tabulator.es2015.min.js';
const shopAPI = 'https://fakestoreapi.com/products';

class Cart {
    constructor(productId, quantity) {
        this.productId = productId;
        this.quantity = quantity;
    }
}

document.addEventListener("DOMContentLoaded", function () {

    //fetch all for future all product usage or fallbacks

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
        const shopRowTemplate = document.querySelector("#shop-row"),
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

                }
            shopContainer.appendChild(rowClone);                   
            });
        });

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
        

        // quantityNumber.addEventListener('change', e => {
        //     let changeQuantity = document.querySelector(".change-quantity");
        //     let addToCart = document.querySelector(".add-to-cart");
        //     if(e.innerText >= 1) {
        //         addToCart.classList.remove("show");
        //         addToCart.classList.add("hide");
        //         changeQuantity.classList.remove("hide");
        //         changeQuantity.classList.add("show");
        //     }
        // });

        testCart();
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
        quantity.innerText++;
    }

    async function quantityRemove(e) {
        let parent = e.target.parentElement.parentElement;
        let quantity = parent.querySelector(".quantity-number");
        quantity.innerText--;
    }

    async function quantityAdd(e) {
        let parent = e.target.parentElement.parentElement;
        let quantity = parent.querySelector(".quantity-number");
        quantity.innerText++;
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

var testCart = function() {
    fetch('https://fakestoreapi.com/carts/5')
            .then(res=>res.json())
            .then(json=>{
                let data = json.products;
                let items = [];
                data.forEach(e => {
                    items.push(new Cart(e.productId, e.quantity));
                })
                localStorage.setItem('cartItems', JSON.stringify(items));
            })

}


//checkout toggle



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
            fetch(`https://fakestoreapi.com/products/${elem.productId}`)
            .then(res=>res.json())
            .then(json=> {


                //clone new cart item and insert cart item into template
                let cartItemClone = cartItemTemplate.content.cloneNode(true);
                let cartItemImage = cartItemClone.querySelector(".cart-item-image"),
                    cartItemName = cartItemClone.querySelector(".cart-item-name"),
                    cartItemPrice = cartItemClone.querySelector(".cart-item-price");

                cartItemImage.src=json.image;
                cartItemName.innerText=json.title;
                cartItemPrice.innerText=json.price;
                
                cartContainer.appendChild(cartItemClone);
            });


        });
    }



}

var saveCart = function(cart) {
    let storage = JSON.stringify(cart);
    localStorage.setItem("cartItems", storage);
}

//TODO: add quantitiy buttons
//current idea is a function that uses the template to generate the button
//+ and - programatically add and remove quantity
//then a listener changes the quantity displayed