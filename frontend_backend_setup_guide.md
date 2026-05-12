# Frontend Developer Backend Setup Guide

Since you are a frontend developer using Antigravity, you do not need to manually deal with pgAdmin SQL imports (which is what caused the constraint violations). 

Instead, you can just have your Antigravity set up the backend using **SQLite** (a lightweight file-based database built into PHP) so you can run the API locally without needing PostgreSQL installed at all.

### Step 1: Ensure you have PHP and Composer
Open your terminal and check if you have these installed:
```cmd
php -v
composer -v
```
*If you don't have them, download and install [PHP for Windows](https://windows.php.net/download/) and [Composer](https://getcomposer.org/download/).*

### Step 2: Give this prompt to your Antigravity
Copy and paste the exact text below into your Antigravity chat:

> **PROMPT FOR ANTIGRAVITY:**
> "I am a frontend developer on the JVD project and I need to get the Laravel backend running locally so I can test my UI. Please perform the following steps for me:
> 1. Go into the `backend/` directory.
> 2. Run `composer install` to get all dependencies.
> 3. Copy `.env.example` to `.env`.
> 4. Run `php artisan key:generate`.
> 5. Modify the `.env` file and set `DB_CONNECTION=sqlite`. Delete the other `DB_*` variables (DB_HOST, DB_PORT, etc) to ensure it defaults cleanly to SQLite.
> 6. Run `php artisan migrate:fresh --seed`. If it asks to create the sqlite database file, say yes. This will completely build my database and avoid all pgAdmin constraint errors.
> 7. Run `php artisan serve` so the API is live at http://127.0.0.1:8000."

### Step 3: Run the Frontend
Once Antigravity tells you the backend API is running successfully, you can open a new terminal in your `frontend/` folder and run your React app normally:
```cmd
npm install
npm run dev
```
