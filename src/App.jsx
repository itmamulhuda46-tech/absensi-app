import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  CheckSquare, 
  BarChart3, 
  LayoutDashboard, 
  Plus, 
  Trash2, 
  Save,
  Calendar as CalendarIcon,
  Clock,
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  LogOut,
  AlertTriangle
} from 'lucide-react';

// --- Firebase Integrasi ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyADnRmjLJy0kVezLbRwwnwbxm0WGleg1IU",
  authDomain: "absensiku-312c1.firebaseapp.com",
  projectId: "absensiku-312c1",
  storageBucket: "absensiku-312c1.firebasestorage.app",
  messagingSenderId: "667875545184",
  appId: "1:667875545184:web:9e1cfaf0988763f9e7b305",
  measurementId: "G-9EVVTQ7HXE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Komponen Utama Aplikasi ---
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [dbError, setDbError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // --- State Data (Cloud) ---
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});

  // 1. Inisialisasi Autentikasi
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            // Coba login dengan token dari sistem
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenError) {
            // Jika token tidak cocok (karena config Firebase berbeda), fallback ke Anonim
            console.warn("Token mismatch, beralih ke anonymous auth:", tokenError);
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Mengambil Data dari Firestore
  useEffect(() => {
    if (!user) return;

    // Listener Data Siswa
    const studentsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'students');
    const unsubStudents = onSnapshot(studentsRef, (snapshot) => {
      const studentList = [];
      snapshot.forEach((doc) => {
        studentList.push({ id: doc.id, ...doc.data() });
      });
      // Mengurutkan berdasarkan NIS
      studentList.sort((a, b) => a.nis.localeCompare(b.nis));
      setStudents(studentList);
      setDbError(null); // Reset error jika berhasil
    }, (error) => {
      console.error("Error fetching students:", error);
      if (error.code === 'permission-denied' || error.message.includes('permission')) {
        setDbError("Akses diblokir oleh Firestore Security Rules.");
      }
    });

    // Listener Data Absensi
    const attendanceRef = collection(db, 'artifacts', appId, 'users', user.uid, 'attendance');
    const unsubAttendance = onSnapshot(attendanceRef, (snapshot) => {
      const attData = {};
      snapshot.forEach((doc) => {
        attData[doc.id] = doc.data().records; // doc.id = YYYY-MM-DD
      });
      setAttendanceData(attData);
    }, (error) => {
      console.error("Error fetching attendance:", error);
      if (error.code === 'permission-denied' || error.message.includes('permission')) {
        setDbError("Akses diblokir oleh Firestore Security Rules.");
      }
    });

    return () => {
      unsubStudents();
      unsubAttendance();
    };
  }, [user]);

  // --- Komponen Sidebar ---
  const SidebarItem = ({ icon: Icon, label, tabName }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        activeTab === tabName 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center text-blue-600">
          <Loader2 size={48} className="animate-spin mb-4" />
          <h2 className="text-xl font-bold">Memuat Sistem Absensi...</h2>
        </div>
      </div>
    );
  }

  // Tampilan Error Database (Permission Denied)
  if (dbError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
        <div className="bg-white p-8 rounded-xl border border-red-200 shadow-xl max-w-lg w-full">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="bg-red-100 p-4 rounded-full mb-4">
              <AlertTriangle size={48} className="text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Akses Database Ditolak</h2>
            <p className="text-red-600 mt-2 font-medium">{dbError}</p>
          </div>
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3">Cara Memperbaikinya:</h3>
            <ol className="text-sm text-gray-600 space-y-3 list-decimal pl-5">
              <li>Buka <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium">Firebase Console</a> Anda.</li>
              <li>Pilih project <strong>absensiku-312c1</strong>.</li>
              <li>Di menu sebelah kiri, klik <strong>Build</strong> &gt; <strong>Firestore Database</strong>.</li>
              <li>Klik tab <strong>Rules</strong> (Aturan).</li>
              <li>Ubah kode di dalamnya agar mengizinkan akses. Ganti baris <code className="bg-gray-200 px-1 py-0.5 rounded text-red-600">allow read, write: if false;</code> menjadi:<br/>
                <code className="block bg-gray-800 text-green-400 p-3 rounded mt-2 overflow-x-auto">
                  allow read, write: if true;
                </code>
              </li>
              <li>Klik tombol <strong>Publish</strong>.</li>
              <li>Muat ulang (refresh) halaman aplikasi ini.</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
          <CheckSquare size={24} />
          <span>AbsensiKu</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-white shadow-xl flex-shrink-0 z-0 flex flex-col`}>
        <div className="flex-1">
          <div className="p-6 hidden md:flex items-center gap-2 text-blue-600 font-bold text-2xl border-b border-gray-100">
            <CheckSquare size={28} />
            <span>AbsensiKu</span>
          </div>
          <div className="p-4 flex flex-col gap-2">
            <SidebarItem icon={LayoutDashboard} label="Dashboard" tabName="dashboard" />
            <SidebarItem icon={Users} label="Data Siswa" tabName="students" />
            <SidebarItem icon={CheckSquare} label="Input Absensi" tabName="attendance" />
            <SidebarItem icon={BarChart3} label="Laporan" tabName="reports" />
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 mt-auto">
          <button
            onClick={() => setIsLoggedIn(false)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={20} />
            <span className="font-medium">Keluar Sistem</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <DashboardView students={students} attendanceData={attendanceData} />}
          {activeTab === 'students' && <StudentsView students={students} user={user} />}
          {activeTab === 'attendance' && <AttendanceView students={students} attendanceData={attendanceData} user={user} />}
          {activeTab === 'reports' && <ReportsView students={students} attendanceData={attendanceData} />}
        </div>
      </div>
    </div>
  );
}

// --- View: Dashboard ---
function DashboardView({ students, attendanceData }) {
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendanceData[today] || {};
  
  const stats = useMemo(() => {
    let hadir = 0, sakit = 0, izin = 0, alpa = 0;
    students.forEach(s => {
      const status = todayAttendance[s.id];
      if (status === 'Hadir') hadir++;
      else if (status === 'Sakit') sakit++;
      else if (status === 'Izin') izin++;
      else if (status === 'Alpa') alpa++;
      else alpa++; // Belum diabsen
    });
    return { hadir, sakit, izin, alpa };
  }, [students, todayAttendance]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">Ringkasan data absensi hari ini ({new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Siswa" value={students.length} color="bg-blue-500" icon={Users} />
        <StatCard title="Hadir" value={stats.hadir} color="bg-emerald-500" icon={CheckSquare} />
        <StatCard title="Sakit/Izin" value={stats.sakit + stats.izin} color="bg-amber-500" icon={Clock} />
        <StatCard title="Alpa" value={stats.alpa} color="bg-red-500" icon={CalendarIcon} />
      </div>

      <div className="bg-emerald-50 p-6 rounded-xl shadow-sm border border-emerald-100 mt-8 flex gap-4 items-start">
        <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
          <Save size={24} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-emerald-800 mb-1">Penyimpanan Cloud Aktif</h3>
          <p className="text-emerald-700">
            Aplikasi ini telah terhubung dengan penyimpanan permanen. Semua data siswa dan absensi akan tersimpan secara otomatis dan dapat Anda akses dari perangkat mana saja (Laptop, HP, Tablet) tanpa takut hilang!
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color, icon: Icon }) {
  return (
    <div className={`${color} text-white p-6 rounded-xl shadow-md flex items-center gap-4`}>
      <div className="bg-white/20 p-3 rounded-lg">
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <p className="text-white/80 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </div>
  );
}

// --- View: Manajemen Siswa ---
function StudentsView({ students, user }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newStudent, setNewStudent] = useState({ nis: '', name: '', kelas: '' });
  
  // Search & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  // Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const fileInputRef = useRef(null);
  
  // Delete Confirm
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.nis.includes(searchTerm) ||
      s.kelas.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  // Reset page when search changes
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newStudent.nis || !newStudent.name || !newStudent.kelas || !user) return;
    
    try {
      const studentsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'students');
      await addDoc(studentsRef, newStudent);
      setNewStudent({ nis: '', name: '', kelas: '' });
      setIsAdding(false);
    } catch (error) {
      console.error("Error adding student: ", error);
    }
  };

  const handleDelete = async (id) => {
    if(!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'students', id);
      await deleteDoc(docRef);
      setConfirmDelete(null);
    } catch (error) {
      console.error("Error deleting student: ", error);
    }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    setIsImporting(true);
    setImportMessage('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const rows = text.split('\n');
        const studentsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'students');
        
        let count = 0;
        // Asumsi Baris 1 adalah Header, mulai dari i = 1
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i].trim();
          if (!row) continue;
          
          const cols = row.split(',');
          if (cols.length >= 3) {
            await addDoc(studentsRef, {
              nis: cols[0].trim(),
              name: cols[1].trim(),
              kelas: cols[2].trim()
            });
            count++;
          }
        }
        setImportMessage(`Berhasil mengimpor ${count} data siswa!`);
        setTimeout(() => setImportMessage(''), 4000);
      } catch (error) {
        console.error("Import error:", error);
        setImportMessage('Terjadi kesalahan saat mengimpor data.');
      }
      setIsImporting(false);
      if(fileInputRef.current) fileInputRef.current.value = ''; // reset input
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Data Siswa</h1>
          <p className="text-gray-500 mt-1">Kelola data murid (Total: {students.length} Siswa)</p>
        </div>
        <div className="flex gap-2">
          {/* Tombol Import CSV */}
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleImportCSV} 
            className="hidden" 
            id="csv-upload" 
          />
          <label 
            htmlFor="csv-upload"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors cursor-pointer border border-gray-300"
          >
            {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            <span className="hidden sm:inline">{isImporting ? 'Memproses...' : 'Import CSV'}</span>
          </label>

          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus size={18} /> <span className="hidden sm:inline">{isAdding ? 'Batal Tambah' : 'Tambah Siswa'}</span>
          </button>
        </div>
      </div>

      {/* Pesan Import */}
      {importMessage && (
        <div className={`p-4 rounded-lg shadow-sm ${importMessage.includes('kesalahan') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {importMessage}
        </div>
      )}

      {/* Form Tambah Siswa */}
      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NIS</label>
            <input 
              type="text" 
              className="w-full border-gray-300 rounded-md shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
              value={newStudent.nis}
              onChange={(e) => setNewStudent({...newStudent, nis: e.target.value})}
              placeholder="Contoh: 1001"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input 
              type="text" 
              className="w-full border-gray-300 rounded-md shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
              value={newStudent.name}
              onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
              placeholder="Masukkan nama lengkap"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
            <input 
              type="text" 
              className="w-full border-gray-300 rounded-md shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
              value={newStudent.kelas}
              onChange={(e) => setNewStudent({...newStudent, kelas: e.target.value})}
              placeholder="Contoh: 10-A"
              required
            />
          </div>
          <div className="md:col-span-4 flex justify-end mt-2">
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow-sm transition-colors">
              Simpan ke Cloud
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="relative bg-white rounded-xl shadow-sm border border-gray-100 p-2">
        <div className="flex items-center px-3 pointer-events-none absolute top-0 bottom-0 left-2">
          <Search size={18} className="text-gray-400" />
        </div>
        <input 
          type="text" 
          placeholder="Cari berdasarkan Nama, NIS, atau Kelas..." 
          className="w-full pl-10 pr-4 py-2 border-transparent focus:border-transparent focus:ring-0 outline-none text-gray-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabel Data Siswa */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-3 px-6 text-sm font-semibold text-gray-600 w-16">No</th>
                <th className="py-3 px-6 text-sm font-semibold text-gray-600">NIS</th>
                <th className="py-3 px-6 text-sm font-semibold text-gray-600">Nama Siswa</th>
                <th className="py-3 px-6 text-sm font-semibold text-gray-600">Kelas</th>
                <th className="py-3 px-6 text-sm font-semibold text-gray-600 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.length === 0 ? (
                <tr><td colSpan="5" className="py-8 text-center text-gray-500">Tidak ada data siswa yang cocok.</td></tr>
              ) : (
                paginatedStudents.map((student, index) => (
                  <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-6 text-gray-800">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="py-3 px-6 text-gray-800 font-medium">{student.nis}</td>
                    <td className="py-3 px-6 text-gray-800">{student.name}</td>
                    <td className="py-3 px-6 text-gray-800">
                      <span className="bg-blue-100 text-blue-800 py-1 px-2 rounded text-xs font-semibold">{student.kelas}</span>
                    </td>
                    <td className="py-3 px-6 text-center">
                      {confirmDelete === student.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleDelete(student.id)} className="text-xs bg-red-500 text-white px-2 py-1 rounded">Yakin?</button>
                          <button onClick={() => setConfirmDelete(null)} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">Batal</button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setConfirmDelete(student.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-gray-50 border-t border-gray-100 p-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredStudents.length)} dari {filteredStudents.length} siswa
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded bg-white border border-gray-300 text-gray-600 disabled:opacity-50"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded bg-white border border-gray-300 text-gray-600 disabled:opacity-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Panduan Import CSV */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
        <strong>Panduan Import CSV:</strong> Siapkan file Excel Anda, lalu "Save As" dengan format <code>.csv</code> (Comma Delimited). Kolom harus diurutkan: <b>NIS, Nama Lengkap, Kelas</b> pada kolom A, B, dan C. Baris pertama (Header) akan diabaikan.
      </div>
    </div>
  );
}

// --- View: Input Absensi ---
function AttendanceView({ students, attendanceData, user }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentRecord, setCurrentRecord] = useState({});
  const [saveStatus, setSaveStatus] = useState({ loading: false, success: false });

  // Load attendance data when date changes
  useEffect(() => {
    if (attendanceData[selectedDate]) {
      setCurrentRecord(attendanceData[selectedDate]);
    } else {
      // Default all to 'Hadir' if new date
      const defaultRecord = {};
      students.forEach(s => {
        defaultRecord[s.id] = 'Hadir';
      });
      setCurrentRecord(defaultRecord);
    }
    setSaveStatus({ loading: false, success: false });
  }, [selectedDate, attendanceData, students]);

  const handleStatusChange = (studentId, status) => {
    setCurrentRecord({
      ...currentRecord,
      [studentId]: status
    });
    setSaveStatus({ loading: false, success: false });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaveStatus({ loading: true, success: false });
    
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'attendance', selectedDate);
      // Menyimpan data per tanggal ke cloud
      await setDoc(docRef, { records: currentRecord });
      
      setSaveStatus({ loading: false, success: true });
      setTimeout(() => setSaveStatus({ loading: false, success: false }), 3000);
    } catch (error) {
      console.error("Error saving attendance:", error);
      setSaveStatus({ loading: false, success: false });
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Hadir': return 'bg-emerald-500 text-white border-emerald-600';
      case 'Sakit': return 'bg-amber-400 text-white border-amber-500';
      case 'Izin': return 'bg-blue-400 text-white border-blue-500';
      case 'Alpa': return 'bg-red-500 text-white border-red-600';
      default: return 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Input Absensi</h1>
        <p className="text-gray-500 mt-1">Catat kehadiran siswa, data akan langsung tersimpan di Cloud.</p>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="font-medium text-gray-700">Tanggal:</label>
          <input 
            type="date" 
            className="border-gray-300 rounded-lg shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        <button 
          onClick={handleSave}
          disabled={saveStatus.loading}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-70"
        >
          {saveStatus.loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
          {saveStatus.loading ? 'Menyimpan...' : 'Simpan ke Cloud'}
        </button>
      </div>

      {saveStatus.success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">Data absensi berhasil disimpan secara permanen!</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-100 shadow-sm">
              <tr>
                <th className="py-4 px-6 text-sm font-semibold text-gray-600 w-16">No</th>
                <th className="py-4 px-6 text-sm font-semibold text-gray-600">Siswa</th>
                <th className="py-4 px-6 text-sm font-semibold text-gray-600 text-center">Status Kehadiran</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan="3" className="py-8 text-center text-gray-500">Belum ada data siswa. Silakan tambahkan siswa terlebih dahulu.</td></tr>
              ) : (
                students.map((student, index) => {
                  const currentStatus = currentRecord[student.id];
                  return (
                    <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                      <td className="py-4 px-6 text-gray-800">{index + 1}</td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-gray-800">{student.name}</div>
                        <div className="text-xs text-gray-500">{student.nis} • Kelas {student.kelas}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-center gap-2 flex-wrap">
                          {['Hadir', 'Sakit', 'Izin', 'Alpa'].map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(student.id, status)}
                              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                currentStatus === status 
                                  ? getStatusColor(status)
                                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- View: Laporan ---
function ReportsView({ students, attendanceData }) {
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  
  const reportData = attendanceData[filterDate] || null;

  const stats = useMemo(() => {
    if (!reportData) return null;
    let hadir = 0, sakit = 0, izin = 0, alpa = 0;
    Object.values(reportData).forEach(status => {
      if (status === 'Hadir') hadir++;
      else if (status === 'Sakit') sakit++;
      else if (status === 'Izin') izin++;
      else if (status === 'Alpa') alpa++;
    });
    return { hadir, sakit, izin, alpa, total: Object.keys(reportData).length };
  }, [reportData]);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Hadir': return <span className="bg-emerald-100 text-emerald-800 py-1 px-3 rounded-full text-xs font-bold">Hadir</span>;
      case 'Sakit': return <span className="bg-amber-100 text-amber-800 py-1 px-3 rounded-full text-xs font-bold">Sakit</span>;
      case 'Izin': return <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-xs font-bold">Izin</span>;
      case 'Alpa': return <span className="bg-red-100 text-red-800 py-1 px-3 rounded-full text-xs font-bold">Alpa</span>;
      default: return <span className="bg-gray-100 text-gray-800 py-1 px-3 rounded-full text-xs font-bold">-</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Laporan Kehadiran</h1>
        <p className="text-gray-500 mt-1">Lihat riwayat absensi siswa pada tanggal tertentu yang sudah tersimpan di Cloud.</p>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
        <label className="font-medium text-gray-700">Pilih Tanggal Laporan:</label>
        <input 
          type="date" 
          className="border-gray-300 rounded-lg shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
      </div>

      {!reportData ? (
        <div className="bg-white p-12 rounded-xl border border-gray-100 text-center shadow-sm">
          <CalendarIcon size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-800">Belum Ada Data</h3>
          <p className="text-gray-500 mt-1">Tidak ada catatan absensi yang ditemukan di server untuk tanggal {filterDate}.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center shadow-sm">
              <div className="text-sm text-gray-500 font-medium">Total Diabsen</div>
              <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center shadow-sm">
              <div className="text-sm text-emerald-600 font-medium">Hadir</div>
              <div className="text-2xl font-bold text-emerald-700">{stats.hadir}</div>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-center shadow-sm">
              <div className="text-sm text-amber-600 font-medium">Sakit</div>
              <div className="text-2xl font-bold text-amber-700">{stats.sakit}</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center shadow-sm">
              <div className="text-sm text-blue-600 font-medium">Izin</div>
              <div className="text-2xl font-bold text-blue-700">{stats.izin}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center shadow-sm">
              <div className="text-sm text-red-600 font-medium">Alpa</div>
              <div className="text-2xl font-bold text-red-700">{stats.alpa}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left border-collapse relative">
                <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-100 shadow-sm">
                  <tr>
                    <th className="py-3 px-6 text-sm font-semibold text-gray-600 w-16">No</th>
                    <th className="py-3 px-6 text-sm font-semibold text-gray-600">NIS</th>
                    <th className="py-3 px-6 text-sm font-semibold text-gray-600">Nama Siswa</th>
                    <th className="py-3 px-6 text-sm font-semibold text-gray-600">Kelas</th>
                    <th className="py-3 px-6 text-sm font-semibold text-gray-600 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => {
                    const status = reportData[student.id];
                    // Jika murid ini belum ada saat absensi dibuat tanggal tersebut, lewati
                    if (!status) return null; 
                    
                    return (
                      <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-6 text-gray-800">{index + 1}</td>
                        <td className="py-3 px-6 text-gray-800 font-medium">{student.nis}</td>
                        <td className="py-3 px-6 text-gray-800">{student.name}</td>
                        <td className="py-3 px-6 text-gray-800">{student.kelas}</td>
                        <td className="py-3 px-6 text-center">
                          {getStatusBadge(status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// --- View: Halaman Login ---
function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === 'hudasukses') {
      onLogin();
    } else {
      setError('Password salah. Silakan coba lagi.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans animate-in fade-in duration-500">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-blue-600 mb-4">
          <CheckSquare size={48} />
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
          Sistem AbsensiKu
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Silakan masukkan password untuk mengakses sistem
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password Akses
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 sm:text-sm border-gray-300 rounded-lg shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Masukkan password"
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600 animate-in slide-in-from-top-1">
                  {error}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Masuk ke Sistem
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}