const API = "https://www.themealdb.com/api/json/v1/1";
const recipesDiv = document.getElementById("recipes");
const popup = document.getElementById("popup");
const catDiv = document.getElementById("categories");
const searchInput = document.getElementById("searchInput");
let currentUser = localStorage.getItem("username");
let favourites = JSON.parse(localStorage.getItem("favourites")) || [];


// Insert inline SVG logos everywhere
document.querySelectorAll(".logo-svg").forEach(span=> {
  span.innerHTML = `<svg width="34" height="34" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style="vertical-align:middle;"><ellipse cx="24" cy="33" rx="18" ry="8" fill="#ffe789"/><ellipse cx="24" cy="25" rx="14" ry="7" fill="#fffbe4"/><ellipse cx="24" cy="13" rx="11" ry="7" fill="#ffe789"/><ellipse cx="24" cy="17" rx="13" ry="8" fill="#fff"/><circle cx="24" cy="17" r="4" fill="#ff7a50"/><ellipse cx="24" cy="38" rx="10" ry="3" fill="#ffc677"/><path d="M13 31 Q24 43 35 31" fill="none" stroke="#fa8624" stroke-width="2"/></svg>`;
});


const themeBtn = document.getElementById("theme-toggle");
themeBtn.onclick = function() {
  const isDark = document.body.classList.toggle("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  themeBtn.textContent = isDark ? "☀️" : "🌙";
};
if(localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark-mode");
  themeBtn.textContent = "☀️";
} else { themeBtn.textContent = "🌙"; }


document.addEventListener("DOMContentLoaded", () => {
  // Login modal
  if (!currentUser) {
    document.getElementById("loginModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
    document.getElementById("doLogin").onclick = () => window.location.href = "login.html";
    document.getElementById("skipLogin").onclick = () => {
      document.getElementById("loginModal").classList.add("hidden");
      document.body.style.overflow = "auto";
    };
  } else {
    document.getElementById("loginModal").classList.add("hidden");
    document.body.style.overflow = "auto";
  }
  loadCategories();
  loadPopularIndianRecipes();
  document.getElementById("searchBtn").onclick = searchRecipes;
  searchInput && searchInput.addEventListener("keypress",e=>{if(e.key==="Enter")searchRecipes();});
  document.getElementById("favLink").onclick = showFavourites;
  document.getElementById("homeLink").onclick = () => { loadPopularIndianRecipes(); };
  document.getElementById("catLink").onclick = () => { catDiv.scrollIntoView({behavior:"smooth"}); };
});


async function loadCategories() {
  catDiv.innerHTML = "";
  const res = await fetch(`${API}/categories.php`);
  const data = await res.json();
  data.categories.slice(0,8).forEach(cat => {
    const el = document.createElement("div");
    el.className = "category-card";
    el.innerHTML = `<img src="${cat.strCategoryThumb}" alt=""><span>${cat.strCategory}</span>`;
    el.onclick = () => loadRecipesByCategory(cat.strCategory);
    catDiv.appendChild(el);
  });
}
async function loadPopularIndianRecipes() {
  recipesDiv.innerHTML = "<div style='text-align:center;'>Loading...</div>";
  const res = await fetch(`${API}/filter.php?a=Indian`);
  const data = await res.json();
  showRecipes((data.meals||[]).slice(0,8));
}
async function loadRecipesByCategory(cat) {
  recipesDiv.innerHTML = "<div style='text-align:center;'>Loading recipes...</div>";
  const res = await fetch(`${API}/filter.php?c=${encodeURIComponent(cat)}`);
  const data = await res.json();
  if (!data.meals) { showRecipes([]); return; }
  let detailedMeals = [];
  for (let i = 0; i < Math.min(8, data.meals.length); i++) {
    let id = data.meals[i].idMeal;
    const r = await fetch(`${API}/lookup.php?i=${id}`);
    const d = await r.json();
    if(d.meals) detailedMeals.push(d.meals[0]);
  }
  showRecipes(detailedMeals);
}
async function searchRecipes() {
  const q = searchInput.value.trim();
  if (!q) return;
  recipesDiv.innerHTML = "<div style='text-align:center;'>Searching...</div>";
  const res = await fetch(`${API}/search.php?s=${encodeURIComponent(q)}`);
  const data = await res.json();
  showRecipes(data.meals || []);
}
function createRecipeCard(meal) {
  const div = document.createElement("div");
  div.className = "recipe-card";
  const isLoggedIn = !!localStorage.getItem("username");
  const isFav = favourites.includes(meal.idMeal);
  div.innerHTML = `
    <img src="${meal.strMealThumb}" alt="${meal.strMeal}" />
    <button class="fav-icon${isFav ? " fav-on" : ""}" title="Save to Favourites">&#10084;</button>
    <h3>${meal.strMeal}</h3>
    <div class="tags">${meal.strCategory ?? ""} ${meal.strArea ? " | " + meal.strArea : ""}</div>
  `;
  // Show detail popup except on heart
  div.onclick = (e) => { if (e.target.classList.contains("fav-icon")) return; showPopup(meal.idMeal, meal.strMeal); };
  // Save/remove favorite logic
  div.querySelector(".fav-icon").onclick = function (e) {
    e.stopPropagation();
    if (!isLoggedIn) {
      alert("Please log in to save favourites!");
      window.location.href = "login.html";
      return;
    }
    const idx = favourites.indexOf(meal.idMeal);
    if (idx === -1) {
      favourites.push(meal.idMeal);
      this.classList.add("fav-on");
    } else {
      favourites.splice(idx,1);
      this.classList.remove("fav-on");
    }
    localStorage.setItem("favourites", JSON.stringify(favourites));
  };
  return div;
}
function showRecipes(meals) {
  recipesDiv.innerHTML = "";
  if (!meals || !meals.length) {
    recipesDiv.innerHTML = "<p>No recipes found. Try another search!</p>";
    return;
  }
  meals.forEach(meal => recipesDiv.appendChild(createRecipeCard(meal)));
}
async function showPopup(id, nameHint = "") {
  const res = await fetch(`${API}/lookup.php?i=${id}`);
  const data = await res.json();
  if (!data.meals || !data.meals[0]) return;
  const meal = data.meals[0];
  let ing = "";
  for (let i = 1; i <= 20; i++) if (meal[`strIngredient${i}`]) ing += `<li>${meal[`strIngredient${i}`]}: ${meal[`strMeasure${i}`] || ""}</li>`;
  popup.innerHTML = `
    <div class="popup-content" tabindex="0">
      <button class="close" onclick="closePopup()">×</button>
      <img src="${meal.strMealThumb}" alt="${meal.strMeal}" />
      <h3>${meal.strMeal}</h3>
      <hr />
      <h4>Ingredients:</h4>
      <ul>${ing}</ul>
      <div style="max-height:160px;overflow:auto;text-align:left">
        <p style="font-size:1.09em">${meal.strInstructions}</p>
      </div>
      ${(meal.strYoutube && meal.strYoutube.length > 0) ? `<button class="youtube-btn" onclick="window.open('${meal.strYoutube}', '_blank')">Watch on YouTube</button>` : ""}
      ${(currentUser) ? `<button class="fav-btn${favourites.includes(id) ? ' selected' : ''}" onclick="toggleFav('${id}',this)">${favourites.includes(id) ? "Saved" : "Save to Favourites"}</button>` : `<div style="margin-top:14px;color:#b91438">Log in to save favourites</div>`}
    </div>
  `;
  popup.classList.remove("hidden");
  document.querySelector(".popup-content").focus();
}
function closePopup() { popup.classList.add("hidden"); }
window.closePopup = closePopup;
function toggleFav(id,btn) {
  const idx = favourites.indexOf(id);
  if (idx === -1) {
    favourites.push(id);
    btn.classList.add("selected");
    btn.textContent = "Saved";
  } else {
    favourites.splice(idx,1);
    btn.classList.remove("selected");
    btn.textContent = "Save to Favourites";
  }
  localStorage.setItem("favourites", JSON.stringify(favourites));
}
window.toggleFav = toggleFav;
async function showFavourites() {
  if (!currentUser) {
    alert("Please log in to use favourites!");
    window.location.href = "login.html";
    return;
  }
  if (!favourites.length) {
    recipesDiv.innerHTML = "<p>No favourite recipes yet.</p>";
    return;
  }
  let dataArr = [];
  for (const id of favourites) {
    const res = await fetch(`${API}/lookup.php?i=${id}`);
    const data = await res.json();
    if (data.meals) dataArr.push(data.meals[0]);
  }
  showRecipes(dataArr);
}


