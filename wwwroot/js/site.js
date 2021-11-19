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
        alert('Error, check console');
        console.error(error);
    }

    function handleData(data) {
        // custom product use
        console.log(data);
    }

    // table

    var table = new Tabulator("#shop", {
        ajaxURL: shopAPI,
        layout: "fitDataFill",
        autoResize: true,
        resizableColumns: false,
        resizableRows: false,
        responsiveLayout: "collapse",
        maxHeight: "100%",
        headerVisible: false, //hide header
        columns: [
            {
                title: "image", field: "image", formatter: "image", function(cell, formatterParams) {
                    return `<img src="${cell.getValue()}" >`
                }, width:200, variableHeight: true, responsive:0
            },
            { title: "title", field: "title", responsive: 1 },
            { title: "category", field: "category", responsive: 2 },
            { title: "description", field: "description", formatter: "textarea", responsive: 0, width:300 },
            { title: "price", field: "price", formatter: "money", responsive: 3 },
            
        ],
    });

});