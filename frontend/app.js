const API_BASE = "http://YOUR_EC2_PUBLIC_IP:5000";
let currentToken = localStorage.getItem("token") || "";
let currentRole = localStorage.getItem("role") || "";
let currentProfile = JSON.parse(localStorage.getItem("profile") || "null");
let pendingBooking = null;
const authStatus = document.getElementById("authStatus");
const logoutBtn = document.getElementById("logoutBtn");
const bookingModal = document.getElementById("bookingModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const bookingsList = document.getElementById("bookingsList");
const servicesList = document.getElementById("servicesList");
function updateSessionUI() {
 if (currentToken && currentRole && currentProfile) {
 authStatus.textContent = `Logged in as ${currentRole}: ${currentProfile.email}`;
 logoutBtn.style.display = "inline-block";
 } else {
 authStatus.textContent = "Not logged in";
 logoutBtn.style.display = "none";
 }
}
updateSessionUI();
function saveSession(token, role, profile) {
 currentToken = token;
 currentRole = role;
 currentProfile = profile;
 localStorage.setItem("token", token);
 localStorage.setItem("role", role);
 localStorage.setItem("profile", JSON.stringify(profile));
 updateSessionUI();
}
function clearSession() {
 currentToken = "";
 currentRole = "";
 currentProfile = null;
 localStorage.removeItem("token");
 localStorage.removeItem("role");
 localStorage.removeItem("profile");
 updateSessionUI();
}
logoutBtn.addEventListener("click", clearSession);
closeModalBtn.addEventListener("click", () => bookingModal.classList.add("hidden"));
function setMessage(id, text) {
 document.getElementById(id).textContent = text || "";
}
async function postJson(url, payload, auth=false, method="POST") {
 const headers = { "Content-Type": "application/json" };
 if (auth && currentToken) headers.Authorization = `Bearer ${currentToken}`;
 const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
 return res.json();
}
document.getElementById("userSignupForm").addEventListener("submit", async e => {
 e.preventDefault();
 const data = await postJson(`${API_BASE}/user/signup`, {
 fullName: userFullName.value,
 email: userEmail.value,
 password: userPassword.value,
 phone: userPhone.value
 });
 setMessage("userMessage", data.message);
 if (data.token) saveSession(data.token, "user", data.user);
});
document.getElementById("userLoginForm").addEventListener("submit", async e => {
 e.preventDefault();
 const data = await postJson(`${API_BASE}/user/login`, {
 email: userLoginEmail.value,
 password: userLoginPassword.value
 });
 setMessage("userMessage", data.message);
 if (data.token) saveSession(data.token, "user", data.user);
});
document.getElementById("providerSignupForm").addEventListener("submit", async e => {
 e.preventDefault();
 const data = await postJson(`${API_BASE}/provider/signup`, {
 businessName: businessName.value,
 ownerName: ownerName.value,
 email: providerEmail.value,
 password: providerPassword.value,
 phone: providerPhone.value,
 category: providerCategory.value,
 city: providerCity.value,
 bio: providerBio.value
 });
 setMessage("providerMessage", data.message);
 if (data.token) saveSession(data.token, "provider", data.provider);
});
document.getElementById("providerLoginForm").addEventListener("submit", async e => {
 e.preventDefault();
 const data = await postJson(`${API_BASE}/provider/login`, {
 email: providerLoginEmail.value,
 password: providerLoginPassword.value
 });
 setMessage("providerMessage", data.message);
 if (data.token) saveSession(data.token, "provider", data.provider);
});
document.getElementById("serviceForm").addEventListener("submit", async e => {
 e.preventDefault();
 if (currentRole !== "provider") return setMessage("providerMessage2", "Log in as a
provider first.");
 const data = await postJson(`${API_BASE}/services/create`, {
 title: serviceTitle.value,
 category: serviceCategory.value,
 description: serviceDescription.value,
 price: servicePrice.value,
 city: serviceCity.value,
 availability: serviceAvailability.value
 }, true);
 setMessage("providerMessage2", data.message);
});
document.getElementById("searchForm").addEventListener("submit", async e => {
 e.preventDefault();
 const params = new URLSearchParams();
 if (searchCategory.value) params.append("category", searchCategory.value);
 if (searchCity.value) params.append("city", searchCity.value);
 const res = await fetch(`${API_BASE}/services?${params.toString()}`);
 const services = await res.json();
 servicesList.innerHTML = "";
 if (!Array.isArray(services) || !services.length) {
 servicesList.innerHTML = `<div class="card">No services found.</div>`;
 return;
 }
 services.forEach(service => {
 const div = document.createElement("div");
 div.className = "card";
 div.innerHTML = `
 <h3>${service.title}</h3>
 <p><strong>Provider:</strong> ${service.providerName}</p>
 <p><strong>Category:</strong> ${service.category}</p>
 <p><strong>Price:</strong> $${service.price}</p>
 <p><strong>City:</strong> ${service.city}</p>
 <p>${service.description}</p>
 <button data-provider="${service.providerId}" data-service="$
{service.serviceId}">Book service</button>
 `;
 div.querySelector("button").addEventListener("click", () =>
openBookingModal(service.providerId, service.serviceId));
 servicesList.appendChild(div);
 });
});
function openBookingModal(providerId, serviceId) {
 if (currentRole !== "user") {
 alert("Log in as a user first.");
 return;
 }
 pendingBooking = { providerId, serviceId };
 bookingModal.classList.remove("hidden");
}
document.getElementById("bookingForm").addEventListener("submit", async e => {
 e.preventDefault();
 if (!pendingBooking) return;
 const data = await postJson(`${API_BASE}/bookings/create`, {
 providerId: pendingBooking.providerId,
 serviceId: pendingBooking.serviceId,
 bookingDate: bookingDate.value,
 bookingTime: bookingTime.value,
 address: bookingAddress.value
 }, true);
 alert(data.message);
 bookingModal.classList.add("hidden");
});
document.getElementById("loadUserBookingsBtn").addEventListener("click", loadUserBookings);
document.getElementById("loadProviderBookingsBtn").addEventListener("click",
loadProviderBookings);
async function loadUserBookings() {
 if (currentRole !== "user") return alert("Log in as a user first.");
 const res = await fetch(`${API_BASE}/bookings/user/me`, {
 headers: { Authorization: `Bearer ${currentToken}` }
 });
 renderBookings(await res.json(), false);
}
async function loadProviderBookings() {
 if (currentRole !== "provider") return alert("Log in as a provider first.");
 const res = await fetch(`${API_BASE}/bookings/provider/me`, {
 headers: { Authorization: `Bearer ${currentToken}` }
 });
 renderBookings(await res.json(), true);
}
function renderBookings(items, providerView) {
 bookingsList.innerHTML = "";
 if (!Array.isArray(items) || !items.length) {
 bookingsList.innerHTML = `<div class="card">No bookings found.</div>`;
 return;
 }
 items.forEach(item => {
 const div = document.createElement("div");
 div.className = "card";
 div.innerHTML = `
 <h3>Booking ${item.bookingId}</h3>
 <p><strong>Date:</strong> ${item.bookingDate}</p>
 <p><strong>Time:</strong> ${item.bookingTime}</p>
 <p><strong>Address:</strong> ${item.address}</p>
 <p><strong>Status:</strong> ${item.status}</p>
 ${providerView ? `
 <div class="stack">
 <button data-status="accepted">Accept</button>
 <button class="secondary-btn" data-status="rejected">Reject</button>
 </div>
 ` : ""}
 `;
 if (providerView) {
 div.querySelectorAll("button").forEach(btn => {
 btn.addEventListener("click", () => updateBookingStatus(item.bookingId,
btn.dataset.status));
 });
 }
 bookingsList.appendChild(div);
 });
}
async function updateBookingStatus(bookingId, status) {
 const data = await postJson(`${API_BASE}/bookings/${bookingId}/status`, { status }, true,
"PUT");
 alert(data.message);
 loadProviderBookings();
}