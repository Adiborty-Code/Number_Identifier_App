import React, { useState, useEffect } from 'react';
import { Camera, Upload, LogOut, User, Sparkles } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB61sfO9_ROZ4J59y91JBmD1DFmAJKGVEs",
  authDomain: "authenticator-2e29d.firebaseapp.com",
  projectId: "authenticator-2e29d",
  storageBucket: "authenticator-2e29d.firebasestorage.app",
  messagingSenderId: "306634839838",
  appId: "1:306634839838:web:ba3657c64215cf64fd1b0f",
  measurementId: "G-X7YS022PF4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

const GEMINI_API_KEY = 'AIzaSyD085j3k1NMwnkpHxplf5zAn-X7FDmFBLc';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [predictedNumber, setPredictedNumber] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 4500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setAuthLoading(true);
    setError('');

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Auth error:', error);
      setError(error.message.replace('Firebase: ', ''));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setPredictedNumber(null);
      setSelectedImage(null);
      setImagePreview(null);
      setError('');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const uploadToFirebase = async (file) => {
    const fileName = `images/${Date.now()}_${user.uid}_${file.name}`;
    const storageRef = ref(storage, fileName);

    try {
      setUploading(true);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      console.log('File uploaded successfully:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('Firebase upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setPredictedNumber(null);
      setShowResult(false);
      setError('');

      try {
        const downloadURL = await uploadToFirebase(file);
        console.log('Image stored at:', downloadURL);
      } catch (error) {
        console.error('Failed to upload to Firebase:', error);
        setError('Failed to upload image to cloud storage');
      }
    }
  };

  const fileToGenerativePart = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result.split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePredict = async () => {
    if (!selectedImage) return;

    setPredicting(true);
    setShowResult(false);
    setError('');

    try {
      console.log('Starting prediction...');
      
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const imagePart = await fileToGenerativePart(selectedImage);
      
      const prompt = "Look carefully at this image. Is there a handwritten number visible? If YES, respond with ONLY that number (it could be a single digit like 5, or multiple digits like 42 or 123). If NO number is visible or if the image shows something else (like scenery, objects, or random scribbles), respond with exactly: NO_NUMBER. Nothing else.";
      
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text().trim();
      
      console.log('API Response:', text);
      
      if (text.toUpperCase().includes('NO_NUMBER') || text.toLowerCase().includes('no number') || text.toLowerCase().includes('not a number')) {
        setError("Can't detect any number (Is your handwriting that bad?)");
        setPredicting(false);
        return;
      }
      
      const number = text.replace(/[^0-9]/g, '');
      
      if (!number || number === '' || text.toLowerCase().includes('cannot') || text.toLowerCase().includes('unable')) {
        setError("Can't detect any number (Is your handwriting that bad?)");
        setPredicting(false);
        return;
      }
      
      const parsedNumber = parseInt(number);
      
      if (parsedNumber === 0 && text.length > 5) {
        setError("Can't detect any number (Is your handwriting that bad?)");
        setPredicting(false);
        return;
      }
      
      if (!isNaN(parsedNumber) && parsedNumber >= 0) {
        setTimeout(() => {
          setPredictedNumber(parsedNumber);
          setShowResult(true);
          setPredicting(false);
        }, 500);
      } else {
        throw new Error(`Could not parse number from response: "${text}"`);
      }
    } catch (error) {
      console.error('Prediction error:', error);
      setError(`Error: ${error.message}`);
      setPredicting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAuth();
    }
  };

  const CrazyBackground = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 animate-gradient" />
      
      {[...Array(25)].map((_, i) => {
        const number = Math.floor(Math.random() * 1000);
        const fontSize = 30 + Math.random() * 80;
        const randomX = Math.random() * 100;
        const randomY = Math.random() * 100;
        const randomDelay = Math.random() * 5;
        const randomDuration = 8 + Math.random() * 12;
        const opacity = 0.1 + Math.random() * 0.2;
        
        return (
          <div
            key={i}
            className="absolute font-bold text-white"
            style={{
              fontSize: `${fontSize}px`,
              left: `${randomX}%`,
              top: `${randomY}%`,
              opacity: opacity,
              animation: `floatNumbers ${randomDuration}s ease-in-out ${randomDelay}s infinite`,
            }}
          >
            {number}
          </div>
        );
      })}
      
      {[...Array(8)].map((_, i) => {
        const colors = [
          'from-pink-500 to-rose-500',
          'from-purple-500 to-indigo-500',
          'from-cyan-500 to-blue-500',
          'from-yellow-500 to-orange-500',
          'from-green-500 to-emerald-500'
        ];
        const color = colors[i % colors.length];
        const size = 100 + Math.random() * 200;
        
        return (
          <div
            key={`orb-${i}`}
            className={`absolute rounded-full bg-gradient-to-br ${color} opacity-30 blur-3xl`}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `pulse ${3 + Math.random() * 4}s ease-in-out ${Math.random() * 2}s infinite`
            }}
          />
        );
      })}
      
      <div className="absolute inset-0 opacity-10">
        {[...Array(20)].map((_, i) => (
          <div
            key={`stripe-${i}`}
            className="absolute h-full w-2 bg-white"
            style={{
              left: `${i * 5}%`,
              transform: 'rotate(45deg) translateY(-50%)',
              animation: `slideStripe ${20 + i * 2}s linear infinite`
            }}
          />
        ))}
      </div>
      
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .5) 25%, rgba(255, 255, 255, .5) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .5) 75%, rgba(255, 255, 255, .5) 76%, transparent 77%, transparent),
            linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .5) 25%, rgba(255, 255, 255, .5) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .5) 75%, rgba(255, 255, 255, .5) 76%, transparent 77%, transparent)
          `,
          backgroundSize: '50px 50px'
        }}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
        <CrazyBackground />
        
        {[...Array(20)].map((_, i) => {
          const randomDigit = Math.floor(Math.random() * 10);
          const randomX = Math.random() * 100;
          const randomY = Math.random() * 100;
          const randomDelay = Math.random() * 4;
          const randomDuration = 4 + Math.random() * 3;
          const randomRotate = Math.random() * 360;
          
          return (
            <div
              key={i}
              className="absolute text-4xl sm:text-5xl md:text-6xl font-bold text-white/15 z-10"
              style={{
                left: `${randomX}%`,
                top: `${randomY}%`,
                animation: `floatRotate ${randomDuration}s ease-in-out ${randomDelay}s infinite`,
                transform: `rotate(${randomRotate}deg)`
              }}
            >
              {randomDigit}
            </div>
          );
        })}
        
        <div className="text-center z-20 px-4 max-w-2xl relative">
          <div className="mb-8 relative">
            <Sparkles className="w-16 h-16 sm:w-20 sm:h-20 text-yellow-300 mx-auto animate-spin-slow" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-yellow-300/20 rounded-full animate-ping" />
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 sm:p-8 md:p-10 border border-white/10 shadow-2xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-2xl">
              I will predict your handwritten number
            </h1>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 animate-pulse drop-shadow-lg pb-2">
              (even with bad handwriting, lol!)
            </h2>
          </div>
          
          <div className="mt-12 flex justify-center gap-3">
            {[0, 1, 2, 3].map((dot) => (
              <div
                key={dot}
                className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full shadow-lg"
                style={{
                  animation: `bounceWave 1.4s ease-in-out ${dot * 0.15}s infinite`
                }}
              />
            ))}
          </div>
        </div>

        <style>{`
          @keyframes floatRotate {
            0%, 100% {
              opacity: 0;
              transform: translateY(0) translateX(0) rotate(0deg) scale(0.8);
            }
            25% {
              opacity: 0.4;
              transform: translateY(-40px) translateX(20px) rotate(90deg) scale(1);
            }
            50% {
              opacity: 0.7;
              transform: translateY(-70px) translateX(-20px) rotate(180deg) scale(1.1);
            }
            75% {
              opacity: 0.4;
              transform: translateY(-40px) translateX(20px) rotate(270deg) scale(1);
            }
          }
          
          @keyframes bounceWave {
            0%, 100% {
              transform: translateY(0) scale(1);
              opacity: 0.6;
            }
            50% {
              transform: translateY(-15px) scale(1.3);
              opacity: 1;
            }
          }

          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes floatNumbers {
            0%, 100% {
              opacity: 0.1;
              transform: translateY(0) translateX(0) rotate(0deg) scale(0.9);
            }
            25% {
              opacity: 0.3;
              transform: translateY(-50px) translateX(30px) rotate(5deg) scale(1);
            }
            50% {
              opacity: 0.25;
              transform: translateY(-100px) translateX(-30px) rotate(-5deg) scale(1.1);
            }
            75% {
              opacity: 0.2;
              transform: translateY(-50px) translateX(20px) rotate(3deg) scale(0.95);
            }
          }

          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          .animate-spin-slow {
            animation: spin-slow 8s linear infinite;
          }

          .animate-gradient {
            background-size: 200% 200%;
            animation: gradient 15s ease infinite;
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
        <CrazyBackground />
        
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 w-full max-w-md border border-white/20 shadow-2xl relative z-10">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-white/20 rounded-full mb-4 shadow-lg">
              <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Number Identifier</h1>
            <p className="text-white/80 text-sm sm:text-base">Recognize handwritten numbers with AI</p>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2.5 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                authMode === 'login'
                  ? 'bg-white text-purple-900 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-2.5 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                authMode === 'signup'
                  ? 'bg-white text-purple-900 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition text-sm sm:text-base"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition text-sm sm:text-base"
            />
            <button
              onClick={handleAuth}
              disabled={authLoading}
              className="w-full py-3 bg-white text-purple-900 rounded-lg font-semibold hover:bg-white/90 transition shadow-lg text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {authLoading ? 'Loading...' : (authMode === 'login' ? 'Login' : 'Sign Up')}
            </button>
            
            {error && (
              <div className="mt-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-white text-xs sm:text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes floatNumbers {
            0%, 100% {
              opacity: 0.1;
              transform: translateY(0) translateX(0) rotate(0deg) scale(0.9);
            }
            25% {
              opacity: 0.3;
              transform: translateY(-50px) translateX(30px) rotate(5deg) scale(1);
            }
            50% {
              opacity: 0.25;
              transform: translateY(-100px) translateX(-30px) rotate(-5deg) scale(1.1);
            }
            75% {
              opacity: 0.2;
              transform: translateY(-50px) translateX(20px) rotate(3deg) scale(0.95);
            }
          }
          
          @keyframes slideStripe {
            0% { transform: rotate(45deg) translateY(-100%); }
            100% { transform: rotate(45deg) translateY(100%); }
          }

          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          .animate-gradient {
            background-size: 200% 200%;
            animation: gradient 15s ease infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative p-4 sm:p-6 overflow-hidden">
      <CrazyBackground />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 pt-4 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 drop-shadow-lg">
            <Camera className="w-6 h-6 sm:w-8 sm:h-8" />
            Number Identifier
          </h1>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 text-white/90 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-sm backdrop-blur-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-6 md:p-8 border border-white/20 shadow-2xl">
          <div className="text-center mb-6">
            <label
              htmlFor="image-upload"
              className="inline-block cursor-pointer group"
            >
              <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 mx-auto border-4 border-dashed border-white/30 rounded-2xl flex flex-col items-center justify-center hover:border-white/60 transition-all group-hover:scale-105 group-hover:shadow-2xl bg-white/5">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Selected"
                    className="w-full h-full object-contain rounded-2xl p-2"
                  />
                ) : (
                  <>
                    <Upload className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-white/60 mb-3 sm:mb-4 group-hover:text-white/80 transition" />
                    <p className="text-white/80 font-semibold text-sm sm:text-base md:text-lg">Upload Image</p>
                    <p className="text-white/60 text-xs sm:text-sm mt-2">JPG or PNG</p>
                  </>
                )}
              </div>
            </label>
            <input
              id="image-upload"
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleImageSelect}
              className="hidden"
              disabled={uploading}
            />
            {uploading && (
              <p className="text-white/80 text-sm mt-2">☁️ Uploading to cloud...</p>
            )}
          </div>

          {selectedImage && (
            <button
              onClick={handlePredict}
              disabled={predicting || uploading}
              className="w-full py-3 sm:py-4 bg-white text-purple-900 rounded-xl font-bold text-base sm:text-lg hover:bg-white/90 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
            >
              {predicting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-3 border-purple-900 border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </span>
              ) : (
                'Identify Number'
              )}
            </button>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-white text-sm backdrop-blur-sm">
              <p className="font-semibold mb-1">😅 Oops!</p>
              <p>{error}</p>
            </div>
          )}
        </div>

        {showResult && predictedNumber !== null && (
          <div className="mt-6 sm:mt-8 text-center px-4">
            <div
              className="inline-block"
              style={{
                animation: 'smoothFadeIn 1.5s ease-in-out'
              }}
            >
              <div className="text-white/80 text-lg sm:text-xl md:text-2xl mb-4 font-semibold flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />
                Predicted Number
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />
              </div>
              <div className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white bg-white/10 backdrop-blur-xl rounded-3xl p-8 sm:p-10 md:p-12 border-4 border-white/30 shadow-2xl">
                {predictedNumber}
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes smoothFadeIn {
            0% {
              opacity: 0;
              transform: scale(0.8) translateY(30px);
            }
            100% {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }

          @keyframes floatNumbers {
            0%, 100% {
              opacity: 0.1;
              transform: translateY(0) translateX(0) rotate(0deg) scale(0.9);
            }
            25% {
              opacity: 0.3;
              transform: translateY(-50px) translateX(30px) rotate(5deg) scale(1);
            }
            50% {
              opacity: 0.25;
              transform: translateY(-100px) translateX(-30px) rotate(-5deg) scale(1.1);
            }
            75% {
              opacity: 0.2;
              transform: translateY(-50px) translateX(20px) rotate(3deg) scale(0.95);
            }
          }

          @keyframes slideStripe {
            0% { transform: rotate(45deg) translateY(-100%); }
            100% { transform: rotate(45deg) translateY(100%); }
          }

          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          .animate-gradient {
            background-size: 200% 200%;
            animation: gradient 15s ease infinite;
          }
        `}</style>
      </div>
    </div>
  );
}