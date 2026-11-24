
/* =========================================
   GLOBAL MARKET 2.0
   MAIN JAVASCRIPT
========================================= */


/* =========================================
   1. MOBILE NAVIGATION
========================================= */

const menuToggle = document.getElementById("menuToggle");

const mainNav = document.getElementById("mainNav");


if (menuToggle && mainNav) {

    menuToggle.addEventListener("click", function () {

        const isOpen = mainNav.classList.toggle("show");

        menuToggle.setAttribute("aria-expanded", isOpen);

        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Close navigation menu" : "Open navigation menu"
        );

    });


    // Close menu after clicking a navigation link

    const navLinks = mainNav.querySelectorAll("a");

    navLinks.forEach(function (link) {

        link.addEventListener("click", function () {

            mainNav.classList.remove("show");

            menuToggle.setAttribute("aria-expanded", "false");

        });

    });


    // Close menu when clicking outside

    document.addEventListener("click", function (event) {

        const clickedInsideMenu = mainNav.contains(event.target);

        const clickedMenuButton = menuToggle.contains(event.target);

        if (!clickedInsideMenu && !clickedMenuButton) {

            mainNav.classList.remove("show");

            menuToggle.setAttribute("aria-expanded", "false");

        }

    });

}



/* =========================================
   2. AUTOMATIC FOOTER YEAR
========================================= */

const currentYear = document.getElementById("currentYear");

if (currentYear) {

    currentYear.textContent = new Date().getFullYear();

}



/* =========================================
   3. HOMEPAGE SEARCH
========================================= */

const searchForm = document.getElementById("searchForm");

const searchInput = document.getElementById("searchInput");

const categorySelect = document.getElementById("categorySelect");


if (searchForm && searchInput && categorySelect) {

    searchForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const searchTerm = searchInput.value.trim();

        const selectedCategory = categorySelect.value;


        // Check whether the user entered a search term

        if (searchTerm === "" && selectedCategory === "all") {

            alert("Please enter something to search for or select a category.");

            searchInput.focus();

            return;

        }


        // Prepare search parameters

        const searchParameters = new URLSearchParams();

        if (searchTerm !== "") {

            searchParameters.set("search", searchTerm);

        }

        if (selectedCategory !== "all") {

            searchParameters.set("category", selectedCategory);

        }


        // Open the future marketplace results page

        window.location.href =
            "category-listings.html?" + searchParameters.toString();

    });

}



/* =========================================
   4. SMOOTH SCROLL FOR INTERNAL LINKS
========================================= */

document.querySelectorAll('a[href^="#"]').forEach(function (link) {

    link.addEventListener("click", function (event) {

        const targetId = this.getAttribute("href");

        if (targetId === "#") return;

        const targetElement = document.querySelector(targetId);

        if (targetElement) {

            event.preventDefault();

            targetElement.scrollIntoView({

                behavior: "smooth"

            });

        }

    });

});



/* =========================================
   5. HOMEPAGE INITIALIZATION
========================================= */

document.addEventListener("DOMContentLoaded", function () {

    console.log("GLOBAL MARKET 2.0 homepage loaded successfully.");

});

