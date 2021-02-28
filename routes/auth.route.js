const Router = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
require('dotenv').config();

const User = require('../models/User');
const File = require('../models/File');
const authMiddleware = require('../middlewares/auth.middleware');
const fileService = require('../services/fileService');

const SECRET_KEY = process.env.SECRET_KEY || 'maslen';

const router = new Router();

router.post('/registration',
  [
    check('email', 'Incorrect email').isEmail(),
    check('password', 'Password length must be at least 5 characters').isLength({ min: 5 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Incorrect data', errors: errors.array() });
      }

      const { email, password } = req.body;

      const candidate = await User.findOne({ email });
      if(candidate) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 7);
      const user = new User({ email, password: hashedPassword });

      await user.save();
      await fileService.createDir(new File({ user: user.id, name: '' }));
      return res.json({ message: 'User was registered' })
    } catch (e) {
      console.log(e);
      res.send({ message: 'Server error' });
    }
  }
)

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if(!user) {
      return res.status(404).json({ message: 'User is not found' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if(!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '1h' });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        diskSpace: user.diskSpace,
        usedSpace: user.usedSpace,
        avatar: user.avatar
      }
    })
  } catch (e) {
    console.log(e);
    res.send({ message: 'Server error' });
  }
})

router.get('/auth', authMiddleware,
  async (req, res) => {
    try {
      const user = await User.findOne({ _id: req.user.id });
      const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '1h' });
      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          diskSpace: user.diskSpace,
          usedSpace: user.usedSpace,
          avatar: user.avatar
        }
      })
    } catch (e) {
      console.log(e);
      res.send({ message: 'Server error' });
    }
  }
)

module.exports = router;