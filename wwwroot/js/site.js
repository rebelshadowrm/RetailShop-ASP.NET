import Tabulator from 'https://unpkg.com/tabulator-tables@4.9.3/dist/js/tabulator.es2015.min.js'

class Cart {
    constructor(productId, quantity) {
        this.productId = productId
        this.quantity = quantity
    }
}
class Comment {
    constructor(productId, rating, title, author, body) {
        this.productId = parseInt(productId)
        this.rating = parseInt(rating)
        this.title = title
        this.author = author
        this.body = body
    }
}
class Order {
    constructor(username, fullName, address, date, productId, quantity) {
        this.username = username
        this.fullName = fullName
        this.address = address
        this.date = date
        this.productId = parseInt(productId)
        this.quantity = parseInt(quantity)
    }
}

//defines property .clearChildren; clears all children
if( typeof Element.prototype.clearChildren === 'undefined' ) {
    Object.defineProperty(Element.prototype, 'clearChildren', {
       configurable: true,
       enumerable: false,
       value: function() {
         while(this.firstChild) this.removeChild(this.lastChild)
       }
     })
 }

 function convertToMoney(val){
    return (Math.floor(val*100).toFixed(0)/100).toFixed(2)
}

async function fetchJSON() {
    const response = await fetch('/js/storeData.json')
    if(!response.ok) {
        const message = `An error has occured: ${response.status}`
        throw new Error(message)
    }
    const json = await response.json()
    return Promise.resolve(json)
}

document.addEventListener("DOMContentLoaded",  async () => {
    try {
        
        await getCartItems()

        const shopCheck = document.querySelector("#shop-container") ?? undefined
        if(shopCheck) {
            const preference = await setPreference(),
                  sort = document.querySelector("#sort")
            sort.value = preference
            await setSortListener()
        }
        
        const checkoutCheck = document.querySelector("#checkout-cart-container") ?? undefined
        if(checkoutCheck) {
            await setShippingListener()
            await setSuccessfulPaymentListener()
        } else {
            await setCartToggle()
        }
        
        const detailsCheck = document.querySelector("#item-details-container") ?? undefined
        if(detailsCheck) {
            let id = window.location.pathname
            id = id.replace("/Home/Details/", "")
            await itemDetailsPage(id)
            await commentBoxListeners()
            let login = document.querySelector(".comment-login")
            login.href = `/Identity/Account/Login?ReturnUrl=/Home/Details/${id}`
        }

        const mobileCartBtn = document.querySelector("#toggleMobileCart")
        mobileCartBtn.addEventListener('click', async () => {
            await toggleCart()
        })

        const orderHistory = document.querySelector("#order-history-container")
        if(orderHistory) await orderHistoryPage()

        const successCheck = document.querySelector("#success-page-container")
        if(successCheck) {
            let orders = sessionStorage.getItem("orders"),
                shipping = sessionStorage.getItem("shipping")
            localStorage.removeItem("cartItems")
            orders = JSON.parse(orders)
            shipping = JSON.parse(shipping)
            await displaySuccessPage(orders, shipping)
        }

        const checkTable = document.querySelector("#salesTable")
        if(checkTable) await getTable()
        
        await setObserver()

    } catch(err) {
        console.log(err.message)
    }
})

async function setShippingListener() {
    try {
        const delivery = document.querySelector("#shippingMethod")
        delivery.addEventListener('change', async (e) => {
            await updateCartBottom()
        })
    } catch(err) {
        console.log(err.message)
    }
}

async function setSuccessfulPaymentListener() {
    try {
        const orderButton = document.querySelector("#btnOrder")
        orderButton.addEventListener('click', async (e) => {
            e.preventDefault()
            await finishCheckout()
        })
        const applePay = document.querySelector("#applepay-btn")
        applePay.addEventListener('click', async (e) => {
            e.preventDefault()
            await finishCheckout()
        })
        const paypal = document.querySelector("#paypal-btn")
        paypal.addEventListener('click', async (e) => {
            e.preventDefault()
            await finishCheckout()
        })
    
    } catch (err) {
        console.log(err.message)
    }
}

async function finishCheckout() {
    try {
        let firstName = document.querySelector("#firstName"),
            lastName = document.querySelector("#lastName"),
            address = document.querySelector("#address"),
            address2 = document.querySelector("#address2")?.value,
            zip = document.querySelector("#zip"),
            state = document.querySelector("#state"),
            city = document.querySelector("#city"),
            shipping = document.querySelector("#shippingMethod").value,
            productId,
            quantity,
            orders = [],
            date = moment().toISOString(),
            username = document.querySelector("#checkout-cart-container")?.dataset.name ,
            fullAddress = `${address?.value} ${address2} ${city?.value}, ${state?.value} , ${zip?.value}`,
            fullName = `${firstName?.value} ${lastName?.value}`,
            cart = await getCartItemsJSON(),
            isValid = false

    isValid = await orderValidation(firstName, lastName, address, city, zip) ?? false
    if(isValid) {
        for (let i = 0; i < cart.length; i++) {
            productId = cart[i].productId
            quantity = cart[i].quantity
            orders.push(new Order(username, fullName, fullAddress, date, productId, quantity))
        }
        let response = await finalizeOrder(orders)
        if(response.status === 201) {
            sessionStorage.setItem("orders", JSON.stringify(orders))
            sessionStorage.setItem("shipping", shipping)
            window.location.replace("/Home/Success")
        }
    }
    } catch(err) {
        console.log(err.message)
    }
}

async function orderValidation(firstName, lastName, address, city, zip) {
    try {
        let firstNameError = firstName.parentElement.querySelector(".invalid-feedback"),
            lastNameError = lastName.parentElement.querySelector(".invalid-feedback"),
            addressError = address.parentElement.querySelector(".invalid-feedback"),
            cityError = city.parentElement.querySelector(".invalid-feedback"),
            zipError = zip.parentElement.querySelector(".invalid-feedback"),
            errors = 0

        firstNameError.classList.remove("show")
        lastNameError.classList.remove("show")
        addressError.classList.remove("show")
        cityError.classList.remove("show")
        zipError.classList.remove("show")
        
        if(firstName?.value.trim() === "")  {
            firstNameError.classList.add("show")
            errors++
        }
        if(lastName?.value.trim() === "") {
            lastNameError.classList.add("show") 
            errors++
        }    
        if(address?.value.trim() === "") {
            addressError.classList.add("show")
            errors++
        }
        if(city?.value.trim() === "") {
            cityError.classList.add("show") 
            errors++
        } 
        if(zip?.value.trim().length !== 5) {
            zipError.classList.add("show")
            errors++
        }
        if(isNaN(zip?.value.trim())) {
            zipError.classList.add("show") 
            errors++
        } 
        if(errors === 0) {
            return true
        }
        return false
    } catch(err) {
        console.log(err.message)
    }
}

async function displaySuccessPage(orders, shipping) {
    try {
        let successPageContainer = document.querySelector("#success-page-container"),
            successPageTemplate = document.querySelector("#success-page-template"),
            successPageClone = successPageTemplate.content.cloneNode(true),
            shop = await fetchJSON(),
            shippingTo = successPageClone.querySelector(".shipping-to"),
            deliveryDate = successPageClone.querySelector(".delivery-date"),
            orderedImg = successPageClone.querySelector(".ordered-item-images"),
            date
        orders = orders ? orders : []
        date = orders[0]?.date ? new Date(orders[0]?.date) : new Date()
        date.setDate(date.getDate() + shipping?.days)
        shippingTo.innerHTML = `<strong>Shipping to ${orders[0]?.fullName}</strong> ${orders[0]?.address}`
        deliveryDate.innerText = moment.utc(date).utcOffset(-6).format("dddd, MMM. D")
        orders?.forEach( e => {
            let img = shop?.filter( ({ id }) => id === e.productId)
            
            orderedImg.innerHTML += `<img src="${img[0].image}"</img>`
        })
        successPageContainer.append(successPageClone)
    } catch(err) {
        console.log(err.message)
    }
}

async function finalizeOrder(orders) {
    try {
        let options = {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'content-type': 'application/json'
            },
            body:JSON.stringify(orders)
        }
        const response = await fetch('/api/orders', options)
        if(!response.ok) {
            const message = `An error has occured: ${response.status}`
            throw new Error(message)
        }
        return Promise.resolve(response)
    } catch(err) {
        console.log(err.message)
    }
}

async function setSortListener() {
    try {
    const sortSelect = document.querySelector("#sort"),
          shopContainer = document.querySelector("#shop-container"),
          preferences = ['category', 'rating', 'price-asc', 'price-dec']
    sortSelect.addEventListener('change', async (e) => {
        let preference = e.target.value
        if(preferences.includes(preference)) {
            await shopContainer.clearChildren()
            if(preference === 'category') await getShopItemsByCategory()
            if(preference === 'rating') await getShopItemOrganized(preference)
            if(preference === 'price-asc') await getShopItemOrganized(preference)
            if(preference === 'price-dec') await getShopItemOrganized(preference)
            await setSortPreference(preference)
            await setShopDetailsOnClick()
        }
    }, false)
    } catch {
        console.log(err.message)
    }
}

async function setPreference() {
    try {
        const preference = await getSortPreference() ?? 'category'
        if (preference === 'category') await getShopItemsByCategory()
        if (preference === 'rating') await getShopItemOrganized(preference)
        if (preference === 'price-asc') await getShopItemOrganized(preference)
        if (preference === 'price-dec') await getShopItemOrganized(preference)
        await setShopDetailsOnClick()
        await setSortPreference(preference)
        return Promise.resolve(preference)
    } catch(err) {
        console.log(err.message)
    }
}

async function getSortPreference() {
    let storage = localStorage.getItem("sortPreference")
    return Promise.resolve(storage)
}
async function setSortPreference(preference) {
    localStorage.setItem("sortPreference", preference)
    return Promise.resolve(preference)
}

async function getShopItemOrganized(preference) {
    try {
        let items = await fetchJSON(),
            shop = document.querySelector("#shop-container"),
            preferences = ['rating', 'price-asc', 'price-dec']
        shop.innerHTML = `<div class="organized-shop"></div>`
        let container = document.querySelector('.organized-shop')
        if(preferences.includes(preference)) {
            if(preference === 'rating') items.sort( (a , b) => {return b.rating.rate - a.rating.rate})
            if(preference === 'price-asc') items.sort( (a , b) => {return a.price - b.price})
            if(preference === 'price-dec') items.sort( (a , b) => {return b.price - a.price})
            await createShopRow(items, container)
        }  
    } catch(err) {
        console.log(err.message)
    }
}

async function getCartItems() {
    try {
        let cartItems = await getCartItemsJSON(),
            cartContainer = document.querySelector(".cart-items")
        for (let index = 0; index < cartItems?.length; index++) {
            let prodId = cartItems[index].productId, json = await fetchJSON()
            if (await hasUniqueCartId(prodId)) {
                let item = json.filter(({ id }) => id === parseInt(prodId))
                cartContainer.appendChild(await createCartItem(item[0]))
            }
        }
        await updateCartBottom()
    } catch (err) {
        console.log(err.message)
    }
}

async function getShopItemsByCategory() {
    try {
        let shopRowTemplate = document.querySelector("#shop-row"),
            shopContainer = document.querySelector("#shop-container"),
            data = await fetchJSON(),
            unique = await getUniqueCategories(data)
        for (let index = 0; index < unique.length; index++) {
            let rowClone = shopRowTemplate.content.cloneNode(true),
                category = rowClone.querySelector(".product-type")
            category.innerText = unique[index]
            let rowItemContainer = rowClone.querySelector(".row-items"),
                itemsInCategory = data.filter( ({ category }) => category === unique[index])
            await createShopRow(itemsInCategory, rowItemContainer)
            shopContainer.appendChild(rowClone)  
        }
    } catch(err) {
        console.log(err.message)
    }
}

async function setShopDetailsOnClick() {
    const clickableShopItems = document.querySelectorAll(".shop-item")
    clickableShopItems.forEach(e => {
        let id = e.querySelector('.item-quantity-container').dataset.item
        e.addEventListener('click', (e) => {
            let parent = e.target.parentElement.parentElement
            //a check that prevents the modal from opening when .quantity-btn is clicked
            if(parent.querySelector(".quantity-btn")) {
                itemDetailsModal(id)
            }
        })
    })
}

async function lockCartToggle() {
    try {
        let cartBtn = document.querySelector("#toggleCart"),
            cart = document.querySelector("#cart-container"),
            main = document.querySelector("main"),
            subBtn = document.querySelector(".cart-submit-btn"),
            taxesGroup = document.querySelector(".taxes-group"),
            shippingGroup = document.createElement("div"),
            shipping = document.querySelector(".shipping-group")
        cart?.classList.add("show")
        main?.classList.add("cartShow")
        cartBtn?.classList.add("disabled")
        subBtn?.remove()
        if(!shipping) {
            shippingGroup.classList.add("shipping-group")
            shippingGroup.innerHTML = `<h3>Shipping</h3><p class="cart-shipping"></p>`
            taxesGroup.after(shippingGroup)
        }
    } catch(err) {
        console.log(err.message)
    }
}

async function setCartToggle() {
    try {
        const cartBtn = document.querySelector("#toggleCart")
        cartBtn.addEventListener('click', async ()=> {
            await toggleCart()
        })
    } catch(err) {
        console.log(err.message)
    }
}

async function toggleCart() {
    let cart = document.querySelector("#cart-container")
    let main = document.querySelector("main")
    cart?.classList.toggle("show")
    main?.classList.toggle("cartShow")
}

async function setObserver() {
    try {
        let observer = new MutationObserver(callback)
        observer.observe(document, {
            childList: true,
            attributes: true,
            subtree: true
        })
    } catch(err) {
        console.log(err.message)
    }
}

async function callback(mutations) {  
    try {
        for (let mutation of mutations) {
            if (mutation.target.matches(".quantity-number")) {
                await updateQuantityNumber(mutation)
                await updateHidden()
            }
        }
    } catch(err) {
        console.log(err.message)
    }
}

async function updateQuantityNumber(mutation) {
    try {
        let parent = mutation.target.parentElement.parentElement,
            changeQuantity = parent.querySelector(".change-quantity"),
            addToCart = parent.querySelector(".add-to-cart")
        if (parseInt(mutation.target.innerText) <= 0) {
            await updateRemoveBtn(changeQuantity, addToCart)
            if(parseInt(mutation.target.innerText) < 0) {
                mutation.target.innerText = 0
            }
            await removeCartItem(parent.parentElement.dataset.item)
        } else if (parseInt(mutation.target.innerText) > 0) {
            await updateAddBtn(changeQuantity, addToCart)
        }
        await updateCartItemToStorage(parent.parentElement.dataset.item, mutation.target.innerText)
        await updateCartBottom()
    } catch(err) {
        console.log(err.message)
    }
}

async function updateRemoveBtn(changeQuantity, addToCart) {
    try {
        changeQuantity.classList.add("hide")
        changeQuantity.classList.remove("show")
        addToCart.classList.add("show")
        addToCart.classList.remove("hide")
    } catch(err) {
        console.log(err.message)
    }
}

async function updateAddBtn(changeQuantity, addToCart) {
    try {
        changeQuantity.classList.add("show")
        changeQuantity.classList.remove("hide")
        addToCart.classList.add("hide")
        addToCart.classList.remove("show")
    } catch(err) {
        console.log(err.message)
    }
}

async function updateHidden() {
    try {
        let cart = document.querySelector("#checkout-cart-container") ?? undefined,
            cartHidden = document.querySelector("#cartItemsJSON"),
            totalHidden = document.querySelector("#cartTotalPrice"),
            total = document.querySelector(".cart-total"),
            items = await getCartItemsJSON() ?? {}
        if(cart) {
        cartHidden.innerText = JSON.stringify(items)
        totalHidden.innerText = total?.innerText ?? 0
        }
    } catch(err) {
        console.log(err.message)
    }
}

// listen for add-to-cart / - and + quantity btn clicks
document.addEventListener('click', async (event) => {
    try {
        if (event.target.matches('.cart-add')) {
            await addToCart(event)
        }
        if (event.target.matches('.quantity-add')) {
            await quantityAdd(event)
        }
        if (event.target.matches('.quantity-remove')) {
            await quantityRemove(event)
        }
        return
    } catch (err) {
        console.log(err.message)
    }
}, false)

async function addToCart(e) {
    try {
        let parent = e.target.parentElement.parentElement,
            quantity = parent.querySelector(".quantity-number"),
            cart = document.querySelector("#cart-container"),
            productId = parent.parentElement.dataset.item
        await addCartItemToStorage(productId)
        await addCartItemToCart(productId)
        quantity.innerText++
        if(!cart.classList.contains("show")) {
            toggleCart()
        }
    } catch(err) {
        console.log(err.message)
    }
}

async function quantityRemove(e) {
    try {
        let parent = e.target.parentElement.parentElement,
            quantity = parent.querySelector(".quantity-number")
        quantity.innerText--
    } catch(err) {
        console.log(err.message)
    }
}

async function quantityAdd(e) {
    try {
        let parent = e.target.parentElement.parentElement,
            quantity = parent.querySelector(".quantity-number")
        quantity.innerText++
    } catch(err) {
        console.log(err.message)
    }
}

async function updateCartBottom() {
    try {
        let quantityField = document.querySelector(".cart-quantity"),
        subtotalField = document.querySelector(".cart-subtotal"),
        taxesField = document.querySelector(".cart-taxes"),
        totalField = document.querySelector(".cart-total"),
        shippingPrice = document.querySelector("#shippingMethod"),
        items = await getCartItemsJSON() ?? [],
        json = await fetchJSON(),
        quantity = 0,
        subtotal = 0,
        taxes = 0.07,
        total = 0,
        checkout = document.querySelector("#checkout-cart-container") ?? undefined

        items?.forEach( e => {
            let item = json.filter( ({ id }) => id === parseInt(e.productId))
            item = item[0]
            quantity += parseInt(e.quantity, 10)
            subtotal += item.price * e.quantity
        })
        shippingPrice = shippingPrice?.value ?  JSON.parse(shippingPrice?.value)?.price : 0
        taxes = subtotal * taxes
        total = taxes + subtotal + shippingPrice
        if (quantityField.innerText != quantity) {
            if(parseInt(quantity) === 1) {
                quantityField.innerText = `(${quantity} item)`
            } else {
                quantityField.innerText = `(${quantity} items)`
            }
            subtotalField.innerText = `$${convertToMoney(subtotal)}`
            taxesField.innerText = 'Calculated at checkout'
            totalField.innerText = 'See at checkout'
            if(checkout) {
            await lockCartToggle()
            let shippingField = document.querySelector(".cart-shipping")
            taxesField.innerText = `$${convertToMoney(taxes)}`
            totalField.innerText = `$${convertToMoney(total)}`
            shippingField.innerText = `$${convertToMoney(shippingPrice)}`
            }
        }
    } catch(err) {
        console.log(err.message)
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
                price = itemClone.querySelector(".product-price")
                      
            image.src=data[i].image
            title.innerText = data[i].title
            rating.style=`--rating: ${data[i].rating.rate}`
            ratingCount.innerText=`(${data[i].rating.count})`
            price.innerText = `$${convertToMoney(data[i].price)}`
            
            let quantityContainer = itemClone.querySelector(".item-quantity-container"),
                quantityClone = await createQuantityBtn(data[i].id)
            quantityContainer.dataset.item=data[i].id
                
            quantityContainer.append(quantityClone)
            rowItemContainer.append(itemClone)               
        }
    } catch(err) {
        console.log(err.message)
    }
}

async function createQuantityBtn(id) {
    let quantityTemplate = document.querySelector("#quantitiy-btn"),
        quantityClone = quantityTemplate.content.cloneNode(true),
        quantityNumber = quantityClone.querySelector(".quantity-number"),
        changeQuantity = quantityClone.querySelector(".change-quantity"),
        addToCart = quantityClone.querySelector(".add-to-cart"),
        cartItems = await getCartItemsJSON(),
        item = cartItems?.filter( ({ productId }) => productId === id.toString()) ?? []

    quantityNumber.innerText = item[0]?.quantity ?? 0

    if (parseInt(quantityNumber.innerText) <= 0) {
        changeQuantity.classList.add("hide")
        changeQuantity.classList.remove("show")
        quantityNumber.innerText = 0
    } else {
        addToCart.classList.add("hide")
        addToCart.classList.remove("show")
    }   
    return Promise.resolve(quantityClone)
}

async function createCartItem(json) {
    let cartItemTemplate = document.querySelector("#cart-item"),
        cartItemClone = cartItemTemplate.content.cloneNode(true),
        cartItemImage = cartItemClone.querySelector(".cart-item-image"),
        cartItemName = cartItemClone.querySelector(".cart-item-name"),
        cartItemPrice = cartItemClone.querySelector(".cart-item-price"),
        cartItem = cartItemClone.querySelector(".cart-item")

    cartItemImage.src=json.image
    cartItemName.innerText=json.title
    cartItemPrice.innerText= convertToMoney(json.price)
    cartItem.dataset.item=json.id

    let cartQuantityContainer = cartItemClone.querySelector(".cart-item-quantity")
    let quantityClone = await createQuantityBtn(json.id)
    cartQuantityContainer.dataset.item=json.id
    cartQuantityContainer.append(quantityClone)
    return Promise.resolve(cartItemClone)
}

async function getUniqueCategories(data) {
    let arr = []
    Object.keys(data).forEach(key => {
        arr.push(data[key].category)
    })
    return Promise.resolve(Array.from(new Set(arr)))
}

async function hasUniqueCartId(id) {
    let items = document.querySelectorAll(".cart-item")
    let i = []
    items.forEach(e => {
        i.push(e.dataset.item)
    })
    let unique = Array.from(new Set(i))
    if((unique.find(element => element === id) === undefined)) {
        return Promise.resolve(true)
    }
}

async function updated(productId) {
    try {
    const event = new CustomEvent("cartUpdated",
    {"bubbles": true, "cancelable": false, detail: { id: productId } 
    })
    document.dispatchEvent(event)
    } catch(err) {
        console.log(err.message)
    }
}

window.addEventListener("cartUpdated", async (event) => {
    try {
        let id = event.detail.id
        let json = await getCartItemsJSON()
        let item = json.filter( ({ productId }) => productId === id.toString())

        let shopItemContainer = document.querySelector(`.item-quantity-container[data-item="${id}"]`)
        let shopItemQuantity = shopItemContainer?.querySelector(`.quantity-number`)

        let cartItemContainer = document.querySelector(`.cart-item-quantity[data-item="${id}"]`)
        let cartItemQuantity = cartItemContainer?.querySelector(`.quantity-number`)

        let itemDetailsContainer = document.querySelector(`.item-details-quantity-container[data-item="${id}"]`)
        let itemDetailsQuantity = itemDetailsContainer?.querySelector(`.quantity-number`)

        let quantity = item[0]?.quantity ?? 0
        var cartQuantity,
            shopQuantity,
            detailQuantity

        let checkout = document.querySelector("#checkout-cart-container")
        if(checkout) {
            cartQuantity = cartItemQuantity?.innerText ?? 0
            shopQuantity = shopItemQuantity?.innerText ?? cartQuantity
            detailQuantity = itemDetailsQuantity?.innerText ?? cartQuantity
        } else {
            cartQuantity = cartItemQuantity?.innerText ?? 0
            shopQuantity = shopItemQuantity?.innerText ?? 0
            detailQuantity = itemDetailsQuantity?.innerText ?? cartQuantity
        }

        if (shopQuantity != cartQuantity   ||
            shopQuantity != detailQuantity ||
            cartQuantity != detailQuantity ) {
                if(shopItemQuantity) shopItemQuantity.innerText = quantity
                if(cartItemQuantity) cartItemQuantity.innerText = quantity
                if(itemDetailsQuantity) itemDetailsQuantity.innerText = quantity
            }
    } catch(err) {
        console.log(err.message)
    }
}, false)

async function addCartItemToCart(productId) {
    try {
        let cartContainer = document.querySelector(".cart-items"),
            json = await fetchJSON(),
            item = json.filter( ({ id }) => id === parseInt(productId))
        cartContainer.appendChild(await createCartItem(item[0]))
    } catch(err) {
        console.log(err.message)
    }
}

async function addCartItemToStorage(productId) {
    try {
        let items = await getCartItemsJSON() ?? []
        if(!items?.some( e => e.productId === productId.toString())) {
            items.push(new Cart(productId, "1"))
        } 
        await setCartItemsJSON(items)
        await updated(productId)
    }catch(err) {
        console.log(err.message)
    }
}

async function updateCartItemToStorage(id, quantity) {
    try {
    let items = await getCartItemsJSON() ?? []
    if(items?.some( e => e.productId === id.toString())) {
        let obj = items.find(e => e.productId == id)
        let index = items.indexOf(obj)
        items.fill(obj.quantity=quantity, index, index++)
    }
    await setCartItemsJSON(items)
    await updated(id) 
    } catch (err) {
        console.log(err.message)
    }
}

async function getCartItemsJSON() {
    let storage = localStorage.getItem("cartItems"),
        cartItems = JSON.parse(storage)
    return Promise.resolve(cartItems)
}

async function setCartItemsJSON(items) {
    let storage = JSON.stringify(items)
    localStorage.setItem("cartItems", storage)
    return Promise.resolve("Cart updated")
}

async function removeCartItem(productId) {
    try {
        let cart = document.querySelector(".cart-items"),
            cartItem = cart.querySelector(`[data-item="${productId}"]`),
            items = await getCartItemsJSON() ?? []
        if(items.some( e => e.productId === productId.toString())) {
            let index = items.map(e => e.productId).indexOf(productId)
            items.splice(index, 1)
            await setCartItemsJSON(items)
            await updated(productId)
            cartItem?.remove()
        }
    } catch(err) {
        console.log(err.message)
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
            item = json?.filter( ({ id }) => id === parseInt(productId)) ?? []
            
        item = item[0]
        image.style.backgroundImage = `url('${item.image}')`

        let itemCardTemplate = document.querySelector("#item-card-template"),
            itemCardClone = itemCardTemplate.content.cloneNode(true),
            name = itemCardClone.querySelector(".item-name"),
            price = itemCardClone.querySelector(".item-price"),
            itemQuantityContainer = itemCardClone.querySelector(".item-quantity-container")

        let quantityClone = await createQuantityBtn(item.id)
        itemQuantityContainer.dataset.item=item.id
        itemQuantityContainer.append(quantityClone)

        name.innerText = item.title
        price.innerText = item.price
        itemCardContainer.append(itemCardClone)
        detailPageContainer.dataset.id = productId
        detailPageContainer.append(detailPageClone)

        let itemDescriptionTemplate = document.querySelector("#item-description-template"),
            itemDescriptionClone = itemDescriptionTemplate.content.cloneNode(true),
            itemDescription = itemDescriptionClone.querySelector(".item-description")
        itemDescription.innerText = item.description
        itemDescriptionContainer.append(itemDescriptionClone)

        let comments = await getAllCommentsByProductId(productId)
        await createComments(comments)

        let itemSpecsTemplate = document.querySelector("#item-specs-template"),
            itemSpecsClone = itemSpecsTemplate.content.cloneNode(true)
        itemSpecsContainer.append(itemSpecsClone)


    } catch (err) {
        console.log(err.message)
    }
}

async function itemDetailsModal(id) {
    try {
        const modal = document.querySelector("#modal-container")
        modal.classList.add("show")
        window.onclick = function (event) {
            if (event.target == modal) {
                modal.classList.remove("show")
            }
        }
        await createDetailModal(id)

    } catch (err) {
        console.log(err.message)
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
        moreDetailsLink= detailsClone.querySelector(".more-details-link")

    let json = await fetchJSON(),
        item = json?.filter( ({ id }) => id === parseInt(productId)) ?? []
    item = item[0]
    
    detailsName.innerText=item.title
    detailsImage.style.backgroundImage = `url('${item.image}')`
    detailsDescription.innerText=item.description
    detailsPrice.innerText=item.price

    moreDetailsLink.href = `/Home/Details/${item.id}`

    let quantityContainer = detailsClone.querySelector(".item-details-quantity-container"),
        quantityClone = await createQuantityBtn(productId)
    quantityContainer.dataset.item=productId
    quantityContainer.append(quantityClone)

    modalContainer.clearChildren()
    modalContainer.append(detailsClone)
    } catch(err) {
        console.log(err.message)
    }
}

async function getOrderHistoryByUsername(username) {
    try {
        const response = await fetch(`/api/orders/${username}`)
        if(!response.ok) {
            const message = `An error has occured: ${response.status}`
            throw new Error(message)
        }
        const json = await response.json()
        return Promise.resolve(json)
    } catch(err) {
        console.log(err.message)
    }
}

async function orderHistoryPage() {
    try {
        let orderHistoryContainer = document.querySelector("#order-history-container"),
            username = orderHistoryContainer?.dataset.name,
            items = await getOrderHistoryByUsername(username) ?? undefined
        if(items) {
            let uniqueDate = [],
                shopItems = await fetchJSON()
            items.forEach( (e) => {
                e.date = moment.utc(e.date).utcOffset(-6).format("yyyy-MM-DDTHH:mm")
            })
            Object.keys(items).forEach(key => {
                uniqueDate.push(items[key].date)
            })
            uniqueDate = Array.from(new Set(uniqueDate))
            uniqueDate.sort( (a , b) => {return b - a})
            for(let i = 0; i < uniqueDate.length; i++) {
                let orderHistoryTemplate = document.querySelector("#order-history-template"),
                    orderHistoryClone = orderHistoryTemplate.content.cloneNode(true),
                    orderHistoryDate = orderHistoryClone.querySelector(".order-history-date"),
                    orderHistoryImages = orderHistoryClone.querySelector(".order-history-images"),
                    orderHistoryPrice = orderHistoryClone.querySelector(".order-history-price"),
                    filteredItems = items.filter( ({ date }) => date === uniqueDate[i])
                

                let totalPrice = 0
                orderHistoryDate.innerText = moment(filteredItems[0].date).format("MMMM Do, yyyy")
                filteredItems.forEach( (e) => {
                    let item = shopItems.filter( ({ id }) => id === e.productId)
                    totalPrice += e.quantity * item[0].price
                    orderHistoryPrice.innerText = `$${convertToMoney(totalPrice)}`

                    orderHistoryImages.innerHTML += `<div class="order-history-image"
                                                          data-tooltip="${item[0].title}">
                                                     <img src="${item[0].image}"  
                                                          alt="${item[0].title}" />
                                                     </div>`

                })
                orderHistoryContainer.append(orderHistoryClone)
            }
    }
    } catch(err) {
        console.log(err.message)
    }
}

async function getAllCommentsByProductId(id) {
    try {
        const response = await fetch('/api/comments')
        if(!response.ok) {
            const message = `An error has occured: ${response.status}`
            throw new Error(message)
        }
        const json = await response.json()
        const items = json.filter( ({ productId }) => productId === parseInt(id))
        return Promise.resolve(items)
    } catch(err) {
        console.log(err.message)
    }
}

async function createComments(comments) {
    try {
        for (let i = 0; i < comments?.length; i++) {
            await createComment(comments[i])
        }
    } catch(err) {
        console.log(err.message)
    }
}

async function createComment(comment, id = undefined) {
    try {
        let itemCommentContainer = document.querySelector(".item-comment-container"),
            itemCommentTemplate = document.querySelector("#item-comment-template"),
            itemCommentClone = itemCommentTemplate.content.cloneNode(true),
            commentContainer = itemCommentClone.querySelector(".comment"),
            commentName = itemCommentClone.querySelector(".comment-title"),
            commentUser = itemCommentClone.querySelector(".user-name"),
            commentRating = itemCommentClone.querySelector(".Stars"),
            commentRating2 = itemCommentClone.querySelector(".comment-rating"),
            commentBody = itemCommentClone.querySelector(".comment-body"),
            commentId = comment?.id ?? id,
            loggedInUser = document.querySelector("#create-comment")?.dataset.name,
            iconContainer = itemCommentClone.querySelector(".icons"),
            icons = 
            `<a data-comment="" class="delete" href="">
                <i class="fas fa-trash-alt"aria-hidden="true"></i>
            </a>            
            <a data-comment="" class="edit" href="">
                <i class="fas fa-pencil-alt" aria-hidden="true"></i>
            </a>     
            <a data-comment="" class="save" href="">
                <i class="fas fa-save" aria-hidden="true"></i>
            </a>`

        let regex = /.+?(?=@)/
        let author = comment?.author.match(regex)
        commentContainer.dataset.id = commentId
        commentName.value = comment?.title
        commentUser.innerText = author
        commentRating.dataset.rating = comment?.rating
        commentRating2.value = comment?.rating
        commentRating.style = `--rating: ${comment?.rating}`
        commentBody.innerText = comment?.body

        if(comment?.author === loggedInUser) {
            iconContainer.innerHTML = icons
        }

        itemCommentContainer.append(itemCommentClone)
    } catch(err) {
        console.log(err.message)
    }
}

async function postComment(comment) {
    let options = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'content-type': 'application/json'
        },
        body:JSON.stringify({
            productId : comment.productId,
            rating : comment.rating,
            title : comment.title,
            author : comment.author,
            body : comment.body
        })
    }
    const response = await fetch('/api/comments', options)
    if(!response.ok) {
        const message = `An error has occured: ${response.status}`
        throw new Error(message)
    }
    return Promise.resolve(response)
}

async function commentBoxListeners() {
    try {
    const postBtn = document.querySelector("#comment-post"),
          cancelBtn = document.querySelector("#comment-cancel"),
          createBtn = document.querySelector("#openCommentCreate"),
          commentCreate = document.querySelector("#create-comment"),
          showComment = document.querySelector(".show-comment-create")

    postBtn?.addEventListener('click', async (e) => {
        e.preventDefault
        let title = document.querySelector('#comment-name'),
            rating = document.querySelector('#comment-rating'),
            body = document.querySelector('#comment-body'),
            productId = document.querySelector('#item-details-container').dataset.id,
            author = document.querySelector('#create-comment').dataset.name,
            error = document.querySelector("#comment-error")

        if(title.value.trim() !== "" && body.value.trim() !== "") {
            let comment = new Comment(productId, rating.value, title.value, author, body.value),
            response = await postComment(comment)
            if(response.status === 201) {
                let json = await response.json()
                await createComment(comment, json.id)
            }
            title.value = ""
            body.value = ""
            rating.value = 5
            error.innerText = ""
            error.dataset.tooltip = ""
            commentCreate.classList.toggle('hidden')
            showComment.classList.toggle("hidden")
        } else {
            let titleError = `✖ Title can't be empty`,
                bodyError = `✖ Body can't be empty`,
                errorMsg = ``
            error.innerText = "Invalid Post"
            if(title.value.trim() === "") errorMsg = titleError
            if(body.value.trim() === "") errorMsg = bodyError
            if(body.value.trim() === "" && title.value.trim() === "") errorMsg =`${titleError}
            ${bodyError}`
            error.dataset.tooltip = errorMsg
        }
    })
    
    cancelBtn?.addEventListener('click', async (e) => {
        e.preventDefault
        commentCreate.classList.toggle("hidden")
        showComment.classList.toggle("hidden")
    })

    createBtn?.addEventListener('click', async (e) => {
        e.preventDefault
        commentCreate.classList.toggle("hidden")
        showComment.classList.toggle("hidden")
    })

    } catch(err) {
        console.log(err.message)
    }
}

document.addEventListener('click', async (event) => {
    if (event.target.matches('.delete')) {
        await deleteComment(event)
    }
if (event.target.matches('.edit')) {
        await editBtn(event)
    }
    if (event.target.matches('.save')) {
        await editComment(event)
    }
    return
}, false);

async function editBtn(e) {
    e.preventDefault();
    let textArea = e.composedPath()[2].querySelector('.comment-body'),
        title = e.composedPath()[3].querySelector(".comment-title"),
        rating = e.composedPath()[3].querySelector(".comment-rating"),
        stars = e.composedPath()[3].querySelector(".Stars"),
        save = e.target.parentElement.querySelector('.save'),
        edit = e.target

    textArea.classList.toggle('editable')
    textArea.readOnly = false
    edit.classList.toggle("active")
    save.classList.toggle("show")
    title.classList.toggle("editable")
    title.readOnly = false
    rating.classList.toggle("hide")
    stars.classList.toggle("hide")
}

async function editComment(e) {
    e.preventDefault();
    try {
    let commentId = e.composedPath()[3]?.dataset.id,
        comment = e.composedPath()[3],
        productId = document.querySelector('#item-details-container')?.dataset.id,
        rating = comment.querySelector('.comment-rating')?.value,
        title = comment.querySelector('.comment-title')?.value,
        author = document.querySelector('#create-comment')?.dataset.name,
        body = comment.querySelector('.comment-body')?.value,
        updatedComment = new Comment(productId, rating, title, author, body)

    await updateComment(commentId, updatedComment)
    comment.querySelector(".comment-body").classList.toggle("editable")
    comment.querySelector(".comment-body").readOnly = true
    comment.querySelector(".comment-title").classList.toggle("editable")
    comment.querySelector(".comment-title").readOnly = true
    comment.querySelector(".Stars").style = `--rating: ${rating}`
    comment.querySelector(".Stars").classList.toggle("hide")
    comment.querySelector(".comment-rating").classList.toggle("hide")
    comment.querySelector(".save").classList.toggle("show")
    comment.querySelector(".edit").classList.toggle("active")
    } catch(err) {
        console.log(err.message)
    }
}

async function updateComment(id, comment) {
    let options = {
        method: 'PUT',
        headers: {
            'Accept': 'application/json',
            'content-type': 'application/json'
        },
        body:JSON.stringify({
            id : id,
            productId : comment.productId,
            rating : comment.rating,
            title : comment.title,
            author : comment.author,
            body : comment.body
        })
    }
    const response = await fetch(`/api/comments/${id}`, options)
    if(!response.ok) {
        const message = `An error has occured: ${response.status}`
        throw new Error(message)
    }
    return Promise.resolve(comment)
}

async function deleteComment(e) {
    try {
        e.preventDefault();
        let comment = e.composedPath()[3],
            id = comment.dataset.id
        let options = {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'content-type': 'application/json'
            }
        }

        const response = await fetch(`/api/comments/${id}`, options)
        if(!response.ok) {
            const message = `An error has occured: ${response.status}`
            throw new Error(message)
        }
        comment.remove()
        return Promise.resolve()
    } catch(err) {
        console.log(err.message)
    }
}

class OrderTable {
    constructor(username, date, title, quantity, price, total) {
        this.username = username
        this.date = date,
        this.title = title,
        this.quantity = quantity,
        this.price = price,
        this.total = total
    }
}

async function generateTableData() {
    let shop = await fetchJSON(),
        orders = await fetchOrderHistory(),
        tableOrders = [],
        filter,
        price
        
    for(let i = 0; i < orders.length; i++) {
        filter = shop.filter( ({ id }) => id === orders[i].productId )
        price = filter[0]?.price * orders[i]?.quantity
        tableOrders.push(
            new OrderTable(
                orders[i]?.username,
                orders[i]?.date,
                filter[0]?.title,
                orders[i]?.quantity,
                filter[0]?.price,
                price 
            ))
    }
    return tableOrders
}

async function fetchOrderHistory() {
    const response = await fetch('/api/orders')
    if(!response.ok) {
        const message = `An error has occured: ${response.status}`
        throw new Error(message)
    }
    const json = await response.json()
    return Promise.resolve(json)
}

async function getTable() {
    let data = await generateTableData()

    const table = new Tabulator("#salesTable", {
        data: data,
        layout: "fitColumns",
        autoResize: true,
        resizableColumns: false,
        resizableRows: false,
        responsiveLayout: "collapse",
        maxHeight: "100%",
        groupBy: "username",
        groupHeader:function(value, count, data, group){
            //value - the value all members of this group share
            //count - the number of rows in this group
            //data - an array of all the row data objects in this group
            //group - the group component for the group
            var total = 0
            data.forEach( (e) => {
                total += e.total
            })
            return "<div style='display: inline-grid; grid-auto-flow: column; grid-template-columns: repeat(2, max-content) 1fr; width: 90%;'><span style='color:#222;'>"+ value +"</span><span style='color:#0aa; justify-self: start;'>(" + count + " item)</span><span style='color:#222; place-self: end;'>$"+(Math.floor(total*100).toFixed(0)/100).toFixed(2)+"</span></div>";
        },
        
        groupStartOpen:false,
        columns: [
            { title: "date", field: "date", formatter:function(cell, formatterParams, onRendered) {
                var value = cell.getValue();
                value = moment.utc(value).utcOffset(-6).format("ha MMM D, YYYY");
                return value;
            }, width:130},
            { title: "Product", field: "title" },
            { title: "Qty", field: "quantity", width:70 },
            { title: "Price", field: "price", formatter: "money", width:90},
            { title: "Total", field: "total", formatter: "money", width:90, bottomCalc:"sum", bottomCalcFormatter:"money" }      
        ]
    })
}
