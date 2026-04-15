# 🎓 School Management System

A **full-stack web application** designed to streamline and manage school operations efficiently.
This system provides role-based access for **Admin, Teachers, and Students** to manage academic and administrative activities in one place.

---

## 🚀 Features

### 👨‍💼 Admin Panel

* Add / Update / Delete Students
* Add / Update / Delete Teachers
* Manage Classes & Sections
* Assign Subjects to Teachers
* Manage Fees & Payments
* View complete system data

---

### 👨‍🏫 Teacher Panel

* View assigned classes & sections
* Mark student attendance
* Upload marks & results
* Manage student performance

---

### 👨‍🎓 Student Panel

* View profile details
* Check attendance records
* View marks & results
* Track fee status

---

## 🛠️ Tech Stack

### Frontend

* React.js
* JavaScript
* TypeScript
* Tailwind CSS / CSS

### Backend

* Supabase (Backend-as-a-Service)
* PostgreSQL Database
* Supabase Auth (Authentication)
* Edge Functions (Serverless APIs)

---

## 🔐 Authentication & Authorization

* Secure login using Supabase Auth
* Role-based access control:

  * Admin → Full access
  * Teacher → Limited access
  * Student → View-only access
* Row Level Security (RLS) implemented

---

## 📂 Project Structure

```
school-management-system/
│
├── src/                  # Frontend source code
├── components/           # Reusable UI components
├── pages/                # Application pages
├── supabase/             # Supabase config & functions
│   ├── functions/        # Edge Functions
│   ├── migrations/       # Database schema
│
├── .env                  # Environment variables
├── package.json
└── README.md
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yagavollateja/school-management-system.git
cd school-management-system
```

---

### 2️⃣ Install Dependencies

```bash
npm install
```

---

### 3️⃣ Setup Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

### 4️⃣ Run the Project

```bash
npm run dev
```

---

## 🧪 Functional Modules

* ✅ Students Management
* ✅ Teachers Management
* ✅ Classes & Sections
* ✅ Attendance System
* ✅ Marks & Results
* ✅ Fees Management

---

## 🐞 Known Issues

* Some admin features may require proper role setup
* Edge function requires authentication token
* Ensure RLS policies are correctly configured

---

## 🔥 Future Enhancements

* Dashboard analytics (charts)
* Notifications system
* Parent portal
* Mobile responsive improvements
* Export reports (PDF/Excel)

---

## 🤝 Contributing

Contributions are welcome!
Feel free to fork this repo and submit a pull request.

---

## 📄 License

This project is open-source and available under the MIT License.

---

## 👨‍💻 Author

**Yagavolla Teja**
Frontend Developer | Full Stack Learner 🚀

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!

