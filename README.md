# Number Identifier (React + Gemini + Firebase)

A simple and fast React web app where users can **upload an image of a handwritten/printed number**, and the app predicts the digit using **Google’s Gemini 2.5 Flash model**.
Firebase Authentication provides secure login, and Firebase Storage safely stores the uploaded images.
The entire application is deployed on **Netlify** for seamless global access.

**Live App:** [https://number-identifier.netlify.app](https://number-identifier.netlify.app)

---

## Features

* **Digit Prediction** using Gemini 2.5 Flash
* **Image Upload** directly from your device
* **Firebase Authentication** (Email/Password Login)
* **Firebase Storage** for image handling
* Lightning-fast and minimal UI
* Deployed on Netlify with smooth CI/CD

---

## Tech Stack

**Frontend**

* React.js
* JavaScript
* CSS

**Backend / Services**

* Firebase Authentication
* Firebase Storage
* Google Gemini API (Gemini-2.5-Flash)

**Deployment**

* Netlify

---

## Installation & Setup

```bash
# Clone the repository
git clone https://github.com/Adiborty-Code/Number_Identifier_App.git
cd number-identifier

# Install dependencies
npm install

# Run the development server
npm start
```

---

## Configuration

Create a `.env` file in the root folder:

```
REACT_APP_FIREBASE_API_KEY=your-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-domain
REACT_APP_FIREBASE_PROJECT_ID=your-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-bucket
REACT_APP_FIREBASE_SENDER_ID=your-sender
REACT_APP_FIREBASE_APP_ID=your-app-id

REACT_APP_GEMINI_API_KEY=your-gemini-api-key
```

---

##  How It Works

1. User logs in using Firebase Authentication
2. User uploads an image
3. Image is stored in Firebase Storage
4. The file URL is sent to **Gemini 2.5 Flash**
5. Gemini analyzes the image and predicts the **digit**
6. Prediction is displayed in the UI

---

## Project Structure

```
/
├── src/
│   ├── components/
│   ├── App.js
│   └── styles/
├── public/
├── package.json
├── package-lock.json
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

---

## Future Improvements

* Add user history (saved predictions)
* Add drag-and-drop uploads
* Improve UI animations

---

## License

This project is open-source and available under the MIT License.

---

## Contributing

Pull requests are welcome!
Feel free to open issues for suggestions or bugs.

---

## Live Demo

**[https://number-identifier.netlify.app](https://number-identifier.netlify.app)**
