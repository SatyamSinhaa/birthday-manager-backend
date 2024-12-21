const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
app.use(express.json());

app.use(cors({
  origin: 'https://elegant-lolly-c94bd9.netlify.app/'
}));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  name: String,
  dob: Date,
  email: String
});

const User = mongoose.model('User', userSchema);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const formatDate = (dateString) => {
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

// Add route
app.post('/api/add-birthday', async (req, res) => {
  const { name, dob, email } = req.body;

  try {
    const user = new User({ name, dob, email });
    await user.save();

    const formattedDob = formatDate(dob);
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Registration Confirmation',
      text: `Dear ${name},\n\nWe are pleased to confirm that your registration was successful.\n\nHere are the details we have on record:\n\nName: ${name}\nDate of Birth: ${formattedDob}\nEmail: ${email}\n\nThank you for registering with us. If you have any questions or need further assistance, please do not hesitate to contact us.\n\nBest regards,\nTrade Syndicate`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ success: false, message: 'Failed to send email' });
      }
      console.log('Email sent:', info.response);
      res.status(200).json({ success: true, message: 'Email sent successfully' });
    });
  } catch (error) {
    console.error('Error saving user:', error);
    res.status(500).json({ success: false, message: 'Failed to save user' });
  }
});

// Delete route
app.delete('/api/delete-birthday/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// Get route
app.get('/api/get-birthdays', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// Reminder function
const checkBirthdays = async () => {
  const today = new Date();
  const users = await User.find();

  users.forEach(user => {
    const userDob = new Date(user.dob);
    if (today.getDate() === userDob.getDate() && today.getMonth() === userDob.getMonth()) {
      const formattedDob = formatDate(user.dob);
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Birthday Reminder',
        text: `Happy Birthday ${user.name}!\n\nWe hope you have a wonderful day today, ${formattedDob}\n\nFrom\nTrade Syndicate.`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending birthday reminder:', error);
        } else {
          console.log('Birthday reminder sent:', info.response);
        }
      });
    }
  });
};


// dail check birthday at 11 AM 
cron.schedule('0 11 * * *', () => {
  console.log('Running daily birthday check...');
  checkBirthdays();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
