require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
 DynamoDBDocumentClient,
 PutCommand,
 QueryCommand,
 ScanCommand,
 UpdateCommand
} = require("@aws-sdk/lib-dynamodb");
const app = express();
app.use(cors());
app.use(express.json());
const ddb = DynamoDBDocumentClient.from(
 new DynamoDBClient({ region: process.env.AWS_REGION })
);
const USERS_TABLE = process.env.USERS_TABLE;
const PROVIDERS_TABLE = process.env.PROVIDERS_TABLE;
const SERVICES_TABLE = process.env.SERVICES_TABLE;
const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE;
const JWT_SECRET = process.env.JWT_SECRET;
function createToken(payload) {
 return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
function authMiddleware(req, res, next) {
 const authHeader = req.headers.authorization || "";
 if (!authHeader.startsWith("Bearer ")) {
 return res.status(401).json({ message: "Missing or invalid token" });
 }
 try {
 req.user = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
 next();
 } catch {
 return res.status(401).json({ message: "Invalid or expired token" });
 }
}
app.get("/", (req, res) => {
 res.json({ message: "Home Service API is running" });
});
app.post("/user/signup", async (req, res) => {
 try {
 const { fullName, email, password, phone } = req.body;
 if (!fullName || !email || !password || !phone) {
 return res.status(400).json({ message: "All fields are required" });
 }
 const existing = await ddb.send(new QueryCommand({
 TableName: USERS_TABLE,
 IndexName: "email-index",
 KeyConditionExpression: "email = :email",
 ExpressionAttributeValues: { ":email": email }
 }));
 if (existing.Items?.length) {
 return res.status(400).json({ message: "User already exists" });
 }
 const userId = `u-${nanoid(10)}`;
 const passwordHash = await bcrypt.hash(password, 10);
 await ddb.send(new PutCommand({
 TableName: USERS_TABLE,
 Item: {
 userId, fullName, email, passwordHash, phone,
 role: "user", createdAt: new Date().toISOString()
 }
 }));
 const token = createToken({ id: userId, email, role: "user" });
 res.status(201).json({
 message: "User account created successfully",
 token,
 user: { userId, fullName, email, phone, role: "user" }
 });
 } catch (err) {
 console.error(err);
 res.status(500).json({ message: "Server error during user signup" });
 }
});
app.post("/user/login", async (req, res) => {
 try {
 const { email, password } = req.body;
 const result = await ddb.send(new QueryCommand({
 TableName: USERS_TABLE,
 IndexName: "email-index",
 KeyConditionExpression: "email = :email",
 ExpressionAttributeValues: { ":email": email }
 }));
 const user = result.Items?.[0];
 if (!user) return res.status(404).json({ message: "User not found" });
 const ok = await bcrypt.compare(password, user.passwordHash);
 if (!ok) return res.status(401).json({ message: "Invalid credentials" });
 const token = createToken({ id: user.userId, email: user.email, role: "user" });
 res.json({
 message: "Login successful",
 token,
 user: { userId: user.userId, fullName: user.fullName, email: user.email, phone:
user.phone, role: user.role }
 });
 } catch (err) {
 console.error(err);
 res.status(500).json({ message: "Server error during user login" });
 }
});
app.post("/provider/signup", async (req, res) => {
 try {
 const { businessName, ownerName, email, password, phone, category, city, bio } =
req.body;
 if (!businessName || !ownerName || !email || !password || !phone || !category || !city
|| !bio) {
 return res.status(400).json({ message: "All fields are required" });
 }
 const existing = await ddb.send(new QueryCommand({
 TableName: PROVIDERS_TABLE,
 IndexName: "email-index",
 KeyConditionExpression: "email = :email",
 ExpressionAttributeValues: { ":email": email }
 }));
 if (existing.Items?.length) {
 return res.status(400).json({ message: "Provider already exists" });
 }
 const providerId = `p-${nanoid(10)}`;
 const passwordHash = await bcrypt.hash(password, 10);
 await ddb.send(new PutCommand({
 TableName: PROVIDERS_TABLE,
 Item: {
 providerId, businessName, ownerName, email, passwordHash, phone,
 category, city, bio, role: "provider", createdAt: new Date().toISOString()
 }
 }));
 const token = createToken({ id: providerId, email, role: "provider" });
 res.status(201).json({
 message: "Provider account created successfully",
 token,
 provider: { providerId, businessName, ownerName, email, phone, category, city, bio,
role: "provider" }
 });
 } catch (err) {
 console.error(err);
 res.status(500).json({ message: "Server error during provider signup" });
 }
});
app.post("/provider/login", async (req, res) => {
 try {
 const { email, password } = req.body;
 const result = await ddb.send(new QueryCommand({
 TableName: PROVIDERS_TABLE,
 IndexName: "email-index",
 KeyConditionExpression: "email = :email",
 ExpressionAttributeValues: { ":email": email }
 }));
 const provider = result.Items?.[0];
 if (!provider) return res.status(404).json({ message: "Provider not found" });
 const ok = await bcrypt.compare(password, provider.passwordHash);
 if (!ok) return res.status(401).json({ message: "Invalid credentials" });
 const token = createToken({ id: provider.providerId, email: provider.email, role:
"provider" });
 res.json({
 message: "Login successful",
 token,
 provider: {
 providerId: provider.providerId,
 businessName: provider.businessName,
 ownerName: provider.ownerName,
 email: provider.email,
 phone: provider.phone,
 category: provider.category,
 city: provider.city,
 bio: provider.bio,
 role: provider.role
 }
 });
 } catch (err) {
 console.error(err);
 res.status(500).json({ message: "Server error during provider login" });
 }
});
app.post("/services/create", authMiddleware, async (req, res) => {
 try {
 if (req.user.role !== "provider") {
 return res.status(403).json({ message: "Only providers can create services" });
 }
 const { title, category, description, price, city, availability } = req.body;
 if (!title || !category || !description || !price || !city || !availability) {
 return res.status(400).json({ message: "All fields are required" });
 }
 const providerLookup = await ddb.send(new QueryCommand({
 TableName: PROVIDERS_TABLE,
 KeyConditionExpression: "providerId = :providerId",
 ExpressionAttributeValues: { ":providerId": req.user.id }
 }));
 const provider = providerLookup.Items?.[0];
 if (!provider) return res.status(404).json({ message: "Provider not found" });
 const service = {
 serviceId: `s-${nanoid(10)}`,
 providerId: provider.providerId,
 providerName: provider.businessName,
 title, category, description,
 price: Number(price), city, availability,
 createdAt: new Date().toISOString()
 };
 await ddb.send(new PutCommand({ TableName: SERVICES_TABLE, Item: service }));
 res.status(201).json({ message: "Service created successfully", service });
 } catch (err) {
 console.error(err);
 res.status(500).json({ message: "Server error while creating service" });
 }
});
app.get("/services", async (req, res) => {
 try {
 const { category, city } = req.query;
 let items = [];
 if (category && city) {
 const result = await ddb.send(new QueryCommand({
 TableName: SERVICES_TABLE,
 IndexName: "category-city-index",
 KeyConditionExpression: "category = :category AND city = :city",
 ExpressionAttributeValues: { ":category": category, ":city": city }
 }));
 items = result.Items || [];
 } else {
 const result = await ddb.send(new ScanCommand({ TableName: SERVICES_TABLE }));
 items = result.Items || [];
 if (category) items = items.filter(i => i.category.toLowerCase() ===
category.toLowerCase());
 if (city) items = items.filter(i => i.city.toLowerCase() === city.toLowerCase());
 }
 res.json(items);
 } catch (err) {
 console.error(err);
 res.status(500).json({ message: "Server error while fetching services" });
 }
});
app.post("/bookings/create", authMiddleware, async (req, res) => {
 try {
 if (req.user.role !== "user") {
 return res.status(403).json({ message: "Only users can create bookings" });
 }
 const { providerId, serviceId, bookingDate, bookingTime, address } = req.body;
 if (!providerId || !serviceId || !bookingDate || !bookingTime || !address) {
 return res.status(400).json({ message: "All fields are required" });
 }
 const booking = {
 bookingId: `b-${nanoid(10)}`,
 userId: req.user.id,
 providerId, serviceId, bookingDate, bookingTime, address,
 status: "pending", createdAt: new Date().toISOString()
 };
 await ddb.send(new PutCommand({ TableName: BOOKINGS_TABLE, Item: booking }));
 res.status(201).json({ message: "Booking created successfully", booking });
 } catch (err) {
 console.error(err);
 res.status(500).json({ message: "Server error while creating booking" });
 }
});
app.get("/bookings/user/me", authMiddleware, async (req, res) => {
 try {
 if (req.user.role !== "user") {
 return res.status(403).json({ message: "Only users can view these bookings" });
 }
 const result = await ddb.send(new QueryCommand({
 TableName: BOOKINGS_TABLE,
 IndexName: "userId-index",
 KeyConditionExpression: "userId = :userId",
 ExpressionAttributeValues: { ":userId": req.user.id }
 }));
 res.json(result.Items || []);
 } catch (err) {
 console.error(err);
 res.status(500).json({ message: "Server error while fetching bookings" });
 }
});
app.get("/bookings/provider/me", authMiddleware, async (req, res) => {
 try {
 if (req.user.role !== "provider") {
 return res.status(403).json({ message: "Only providers can view these bookings" });
 }
 const result = await ddb.send(new QueryCommand({
 TableName: BOOKINGS_TABLE,
 IndexName: "providerId-index",
 KeyConditionExpression: "providerId = :providerId",
 ExpressionAttributeValues: { ":providerId": req.user.id }
 }));
 res.json(result.Items || []);
 } catch (err) {
 console.error(err);
 res.status(500).json({ message: "Server error while fetching bookings" });
 }
});
app.put("/bookings/:bookingId/status", authMiddleware, async (req, res) => {
 try {
 if (req.user.role !== "provider") {
 return res.status(403).json({ message: "Only providers can update booking status" });
 }
 const { bookingId } = req.params;
 const { status } = req.body;
 if (!["pending", "accepted", "rejected", "completed"].includes(status)) {
 return res.status(400).json({ message: "Invalid status" });
 }
 await ddb.send(new UpdateCommand({
 TableName: BOOKINGS_TABLE,
 Key: { bookingId },
 UpdateExpression: "SET #status = :status",
 ExpressionAttributeNames: { "#status": "status" },
 ExpressionAttributeValues: { ":status": status }
 }));
 res.json({ message: "Booking status updated successfully" });
 } catch (err) {
 console.error(err);
 res.status(500).json({ message: "Server error while updating booking status" });
 }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));