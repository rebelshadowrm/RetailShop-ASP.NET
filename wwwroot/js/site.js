import Tabulator from 'https://unpkg.com/tabulator-tables@4.9.3/dist/js/tabulator.es2015.min.js';
const shopAPI = 'https://fakestoreapi.com/products';

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
              shopContainer = document.querySelector("#shop-container");
              
        
        
        
        

        

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
                    let price = itemClone.querySelector(".product-price");
                    price.innerText = `$${itemPrice}`;

                    rowItemContainer.appendChild(itemClone);
                }
            shopContainer.appendChild(rowClone);                   
            });
        });
        
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