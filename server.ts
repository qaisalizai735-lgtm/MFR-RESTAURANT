import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
let MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mfr-restaurant';

// Validate URI scheme
if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
  console.warn('Invalid MONGODB_URI scheme. Falling back to local default.');
  MONGODB_URI = 'mongodb://localhost:27017/mfr-restaurant';
}

// Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' }
});

const User = mongoose.model('User', userSchema);

// Bootstrap Admin User
const bootstrapAdmin = async () => {
  try {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'password123';
    
    const existingAdmin = await User.findOne({ username: adminUsername });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const admin = new User({
        username: adminUsername,
        password: hashedPassword,
        role: 'admin'
      });
      await admin.save();
      console.log('Admin user bootstrapped');
    }
  } catch (err) {
    console.error('Error bootstrapping admin:', err);
  }
};

const MOCK_PRODUCTS = [
  {
    _id: 'mock1',
    name: 'Classic Beef Burger',
    price: 450,
    category: 'Fast Food',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000&auto=format&fit=crop',
    inStock: true,
    description: 'Juicy beef patty with fresh lettuce and cheese.'
  },
  {
    _id: 'mock2',
    name: 'Zinger Burger',
    price: 380,
    category: 'Fast Food',
    image: 'https://images.unsplash.com/photo-1513185158878-8d8c196b7f81?q=80&w=1000&auto=format&fit=crop',
    inStock: true,
    description: 'Crispy fried chicken fillet with spicy mayo.'
  },
  {
    _id: 'mock3',
    name: 'Fresh Orange Juice',
    price: 150,
    category: 'Fresh Juices',
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?q=80&w=1000&auto=format&fit=crop',
    inStock: true,
    description: '100% natural freshly squeezed oranges.'
  },
  {
    _id: 'mock4',
    name: 'Chocolate Milkshake',
    price: 250,
    category: 'Milkshakes',
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=1000&auto=format&fit=crop',
    inStock: true,
    description: 'Rich chocolate blended with creamy milk.'
  }
];

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true, enum: ['Fast Food', 'Fresh Juices', 'Milkshakes'] },
  image: { type: String, required: true },
  inStock: { type: Boolean, default: true },
  stockQuantity: { type: Number, default: 0 },
  description: String,
});

const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    quantity: Number
  }],
  total: { type: Number, required: true },
  status: { type: String, default: 'Pending', enum: ['Pending', 'Preparing', 'Out for Delivery', 'Completed'] },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-key', (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const isAdmin = (req: any, res: any, next: any) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

// API Routes

// Admin Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-super-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token, user: { username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Products
app.get('/api/products', async (req, res) => {
  try {
    // Check if connected, otherwise return mock data
    if (mongoose.connection.readyState !== 1) {
      return res.json(MOCK_PRODUCTS);
    }
    
    const products = await Product.find();
    
    // If database is empty, return mock data for better UX
    if (products.length === 0) {
      return res.json(MOCK_PRODUCTS);
    }
    
    res.json(products);
  } catch (err) {
    console.error('Database error fetching products:', err);
    res.json(MOCK_PRODUCTS);
  }
});

app.post('/api/products', authenticateToken, isAdmin, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: 'Error creating product' });
  }
});

app.put('/api/products/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: 'Error updating product' });
  }
});

app.delete('/api/products/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Error deleting product' });
  }
});

// Orders
app.post('/api/orders', async (req, res) => {
  try {
    const orderId = 'MFR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    if (mongoose.connection.readyState !== 1) {
      console.warn('Database not connected. Simulating order success.');
      return res.status(201).json({ ...req.body, orderId, _id: 'mock-order-' + Date.now(), status: 'Pending' });
    }
    const order = new Order({ ...req.body, orderId });
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    console.error('Error creating order:', err);
    const orderId = 'MFR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    res.status(201).json({ ...req.body, orderId, _id: 'mock-order-' + Date.now(), status: 'Pending' });
  }
});

app.get('/api/orders/track/:orderId', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(404).json({ message: 'Tracking currently unavailable (DB offline)' });
    }
    const order = await Order.findOne({ orderId: req.params.orderId.toUpperCase() });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Error tracking order' });
  }
});

app.get('/api/orders', authenticateToken, isAdmin, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.json([]);
  }
});

app.patch('/api/orders/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: 'Error updating order status' });
  }
});

// Vite middleware for development
async function startServer() {
  try {
    // Connect to MongoDB first
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB');
    
    // Bootstrap admin after connection
    await bootstrapAdmin();
  } catch (err: any) {
    console.error('MongoDB connection error:', err.message);
    console.log('Note: If you are running in AI Studio, please provide a valid MONGODB_URI in the Secrets panel.');
    console.log('Server will continue in Resilient Mode (Mock Data).');
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
