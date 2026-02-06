// Admin Dashboard Class
class AdminDashboard {
    constructor() {
        this.bookings = [];
        this.filteredBookings = [];
        this.bookedSlots = [];
        this.db = null;
        this.auth = null;
        
        this.initializeFirebase();
        this.initializeElements();
        this.bindEvents();
        this.checkAuth();
    }

    initializeFirebase() {
        try {
            // Check if firebase is already initialized
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                this.db = firebase.firestore();
                this.auth = firebase.auth();
                console.log('Firebase initialized successfully');
            } else {
                console.error('Firebase not initialized. Please check firebase-config.js');
                this.showError('Firebase not initialized. Please check configuration.');
            }
        } catch (error) {
            console.error('Firebase initialization error:', error);
            this.showError('Firebase initialization error: ' + error.message);
        }
    }

    async checkAuth() {
        if (!this.auth) {
            this.showError('Authentication not available');
            return;
        }

        // Listen for auth state changes
        this.auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('User logged in:', user.email);
                this.loadBookings();
                this.loadBookedSlots();
            } else {
                console.log('No user logged in');
                // Redirect to login or show login form
                window.location.href = 'index.html'; // Or your login page
            }
        });

        // Check current user
        const user = this.auth.currentUser;
        if (!user) {
            console.log('No current user, redirecting...');
            window.location.href = 'index.html';
        }
    }

    initializeElements() {
        this.elements = {
            loadingSpinner: document.getElementById('loadingSpinner'),
            errorMessage: document.getElementById('errorMessage'),
            errorText: document.getElementById('errorText'),
            bookingsTable: document.getElementById('bookingsTable'),
            bookingsTableBody: document.getElementById('bookingsTableBody'),
            retryBtn: document.getElementById('retryBtn'),
            refreshBtn: document.getElementById('refreshBtn'),
            exportBtn: document.getElementById('exportBtn'),
            searchInput: document.getElementById('searchInput'),
            planFilter: document.getElementById('planFilter'),
            dateFilter: document.getElementById('dateFilter'),
            statusFilter: document.getElementById('statusFilter'),
            totalBookings: document.getElementById('totalBookings'),
            pendingBookings: document.getElementById('pendingBookings'),
            confirmedBookings: document.getElementById('confirmedBookings'),
            totalRevenue: document.getElementById('totalRevenue')
        };
    }

    bindEvents() {
        if (this.elements.retryBtn) {
            this.elements.retryBtn.addEventListener('click', () => this.loadBookings());
        }
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => {
                this.loadBookings();
                this.loadBookedSlots();
            });
        }
        if (this.elements.exportBtn) {
            this.elements.exportBtn.addEventListener('click', () => this.exportToCSV());
        }
        
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', () => this.applyFilters());
        }
        if (this.elements.planFilter) {
            this.elements.planFilter.addEventListener('change', () => this.applyFilters());
        }
        if (this.elements.dateFilter) {
            this.elements.dateFilter.addEventListener('change', () => this.applyFilters());
        }
        if (this.elements.statusFilter) {
            this.elements.statusFilter.addEventListener('change', () => this.applyFilters());
        }
    }

    async loadBookings() {
        try {
            this.showLoading();
            
            if (!this.db) {
                throw new Error('Firebase database not available');
            }
            
            console.log('Loading bookings from Firestore...');
            
            // Fetch from Firebase Firestore
            const snapshot = await this.db.collection('bookings').get();
            this.bookings = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                this.bookings.push({
                    id: doc.id,
                    name: data.name || data.customerName || 'N/A',
                    email: data.email || 'N/A',
                    phone: data.phone || data.phoneNumber || 'N/A',
                    plan: data.plan || 'Basic',
                    date: data.date || data.bookingDate || data.createdAt || 'N/A',
                    status: data.status || 'pending',
                    amount: data.amount || data.price || 0,
                    timestamp: data.timestamp || data.createdAt || new Date().toISOString()
                });
            });
            
            console.log(`Loaded ${this.bookings.length} bookings`);
            
            // Sort by date (newest first)
            this.bookings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            this.filteredBookings = [...this.bookings];
            this.renderBookings();
            this.updateStats();
            this.showTable();
            
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.showError(error.message || 'Cannot load bookings from database');
            
            // Fallback to mock data for testing
            if (this.bookings.length === 0) {
                this.loadMockData();
            }
        }
    }

    async loadBookedSlots() {
        try {
            if (!this.db) return;
            
            const snapshot = await this.db.collection('bookedSlots').get();
            this.bookedSlots = [];
            snapshot.forEach(doc => {
                this.bookedSlots.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log('Loaded booked slots:', this.bookedSlots.length);
        } catch (error) {
            console.error('Error loading booked slots:', error);
        }
    }

    loadMockData() {
        // Mock data for testing
        this.bookings = [
            { 
                id: 'mock-1', 
                name: "John Smith", 
                email: "john@example.com", 
                phone: "+1-234-567-8901", 
                plan: "Pro", 
                date: "2024-01-15", 
                status: "confirmed", 
                amount: 299,
                timestamp: "2024-01-15T10:30:00Z"
            },
            { 
                id: 'mock-2', 
                name: "Emma Johnson", 
                email: "emma@example.com", 
                phone: "+1-234-567-8902", 
                plan: "Basic", 
                date: "2024-01-16", 
                status: "pending", 
                amount: 99,
                timestamp: "2024-01-16T14:45:00Z"
            }
        ];
        this.filteredBookings = [...this.bookings];
        this.renderBookings();
        this.updateStats();
        this.showTable();
    }

    showLoading() {
        if (this.elements.loadingSpinner) this.elements.loadingSpinner.style.display = 'block';
        if (this.elements.errorMessage) this.elements.errorMessage.style.display = 'none';
        if (this.elements.bookingsTable) this.elements.bookingsTable.style.display = 'none';
    }

    showError(message) {
        if (this.elements.loadingSpinner) this.elements.loadingSpinner.style.display = 'none';
        if (this.elements.errorMessage) {
            this.elements.errorMessage.style.display = 'block';
            this.elements.errorText.textContent = message;
        }
        if (this.elements.bookingsTable) this.elements.bookingsTable.style.display = 'none';
    }

    showTable() {
        if (this.elements.loadingSpinner) this.elements.loadingSpinner.style.display = 'none';
        if (this.elements.errorMessage) this.elements.errorMessage.style.display = 'none';
        if (this.elements.bookingsTable) this.elements.bookingsTable.style.display = 'block';
    }

    renderBookings() {
        if (!this.elements.bookingsTableBody) return;
        
        const tbody = this.elements.bookingsTableBody;
        tbody.innerHTML = '';

        if (this.filteredBookings.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-calendar-times" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                        No bookings found
                    </td>
                </tr>
            `;
            return;
        }

        this.filteredBookings.forEach(booking => {
            const row = document.createElement('tr');
            const shortId = booking.id.substring(0, 8) + (booking.id.length > 8 ? '...' : '');
            
            row.innerHTML = `
                <td title="${booking.id}">${shortId}</td>
                <td>${booking.name}</td>
                <td>${booking.email}</td>
                <td>${booking.phone}</td>
                <td><span class="plan-badge">${booking.plan}</span></td>
                <td>${this.formatDate(booking.date)}</td>
                <td><span class="status-badge status-${booking.status}">${booking.status.toUpperCase()}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn action-view" onclick="admin.viewBooking('${booking.id}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn action-edit" onclick="admin.editBooking('${booking.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn action-delete" onclick="admin.deleteBooking('${booking.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    applyFilters() {
        if (this.bookings.length === 0) return;
        
        let filtered = [...this.bookings];
        
        // Apply plan filter
        const planFilter = this.elements.planFilter ? this.elements.planFilter.value : 'all';
        if (planFilter !== 'all') {
            filtered = filtered.filter(booking => 
                booking.plan.toLowerCase() === planFilter.toLowerCase()
            );
        }
        
        // Apply status filter
        const statusFilter = this.elements.statusFilter ? this.elements.statusFilter.value : 'all';
        if (statusFilter !== 'all') {
            filtered = filtered.filter(booking => 
                booking.status.toLowerCase() === statusFilter.toLowerCase()
            );
        }
        
        // Apply date filter
        const dateFilter = this.elements.dateFilter ? this.elements.dateFilter.value : 'all';
        if (dateFilter !== 'all') {
            const today = new Date();
            filtered = filtered.filter(booking => {
                try {
                    const bookingDate = new Date(booking.date);
                    if (isNaN(bookingDate.getTime())) return false;
                    
                    switch (dateFilter) {
                        case 'today':
                            return bookingDate.toDateString() === today.toDateString();
                        case 'week':
                            const weekAgo = new Date(today);
                            weekAgo.setDate(today.getDate() - 7);
                            return bookingDate >= weekAgo;
                        case 'month':
                            const monthAgo = new Date(today);
                            monthAgo.setMonth(today.getMonth() - 1);
                            return bookingDate >= monthAgo;
                        default:
                            return true;
                    }
                } catch (e) {
                    return false;
                }
            });
        }
        
        // Apply search filter
        const searchInput = this.elements.searchInput;
        if (searchInput && searchInput.value.trim()) {
            const searchTerm = searchInput.value.toLowerCase().trim();
            filtered = filtered.filter(booking => 
                (booking.name && booking.name.toLowerCase().includes(searchTerm)) ||
                (booking.email && booking.email.toLowerCase().includes(searchTerm)) ||
                (booking.phone && booking.phone.includes(searchTerm)) ||
                (booking.plan && booking.plan.toLowerCase().includes(searchTerm))
            );
        }
        
        this.filteredBookings = filtered;
        this.renderBookings();
    }

    async deleteBooking(id) {
        if (!confirm('Are you sure you want to delete this booking? This will also free up the booked time slot.')) {
            return;
        }
        
        try {
            if (!this.db) {
                throw new Error('Database not available');
            }
            
            // Delete booking
            await this.db.collection('bookings').doc(id).delete();
            console.log('Booking deleted:', id);
            
            // Also delete associated booked slot
            const slotQuery = await this.db.collection('bookedSlots')
                .where('bookingId', '==', id)
                .get();
            
            const deletePromises = [];
            slotQuery.forEach(doc => {
                deletePromises.push(this.db.collection('bookedSlots').doc(doc.id).delete());
            });
            
            await Promise.all(deletePromises);
            console.log('Associated slots deleted');
            
            // Remove from local arrays
            this.bookings = this.bookings.filter(b => b.id !== id);
            this.bookedSlots = this.bookedSlots.filter(s => s.bookingId !== id);
            
            this.applyFilters();
            this.updateStats();
            
            alert('Booking and associated time slot deleted successfully!');
            
            // Refresh slots on main site (if function exists)
            if (typeof window.refreshSlots === 'function') {
                window.refreshSlots();
            }
            
        } catch (error) {
            console.error('Error deleting booking:', error);
            alert('Error deleting booking: ' + error.message);
        }
    }

    async viewBooking(id) {
        const booking = this.bookings.find(b => b.id === id);
        if (!booking) {
            alert('Booking not found');
            return;
        }
        
        const details = `
Booking ID: ${booking.id}
Customer: ${booking.name}
Email: ${booking.email}
Phone: ${booking.phone}
Plan: ${booking.plan}
Date: ${this.formatDate(booking.date)}
Status: ${booking.status}
Amount: $${booking.amount}
        `.trim();
        
        alert(details);
    }

    async editBooking(id) {
        const booking = this.bookings.find(b => b.id === id);
        if (!booking) {
            alert('Booking not found');
            return;
        }
        
        const newStatus = prompt(
            `Edit booking #${id.substring(0, 8)}\n` +
            `Current status: ${booking.status}\n` +
            `Enter new status (pending/confirmed/cancelled/completed):`,
            booking.status
        );
        
        if (newStatus && ['pending', 'confirmed', 'cancelled', 'completed'].includes(newStatus.toLowerCase())) {
            try {
                await this.db.collection('bookings').doc(id).update({
                    status: newStatus.toLowerCase(),
                    updatedAt: new Date().toISOString()
                });
                
                // Update local data
                booking.status = newStatus.toLowerCase();
                this.renderBookings();
                this.updateStats();
                
                alert('Booking status updated successfully!');
            } catch (error) {
                console.error('Error updating booking:', error);
                alert('Error updating booking: ' + error.message);
            }
        }
    }

    updateStats() {
        const total = this.bookings.length;
        const pending = this.bookings.filter(b => b.status === 'pending').length;
        const confirmed = this.bookings.filter(b => b.status === 'confirmed').length;
        const revenue = this.bookings.reduce((sum, booking) => sum + (parseFloat(booking.amount) || 0), 0);
        
        if (this.elements.totalBookings) this.elements.totalBookings.textContent = total;
        if (this.elements.pendingBookings) this.elements.pendingBookings.textContent = pending;
        if (this.elements.confirmedBookings) this.elements.confirmedBookings.textContent = confirmed;
        if (this.elements.totalRevenue) this.elements.totalRevenue.textContent = `$${revenue.toFixed(2)}`;
    }

    formatDate(dateString) {
        if (!dateString || dateString === 'N/A') return 'N/A';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    }

    exportToCSV() {
        if (this.bookings.length === 0) {
            alert('No bookings to export');
            return;
        }
        
        const headers = ['ID', 'Name', 'Email', 'Phone', 'Plan', 'Date', 'Status', 'Amount', 'Timestamp'];
        const csvContent = [
            headers.join(','),
            ...this.bookings.map(b => [
                `"${b.id}"`,
                `"${b.name}"`,
                `"${b.email}"`,
                `"${b.phone}"`,
                `"${b.plan}"`,
                `"${this.formatDate(b.date)}"`,
                `"${b.status}"`,
                b.amount,
                `"${b.timestamp}"`
            ].join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `synced2ps_bookings_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
        alert(`Exported ${this.bookings.length} bookings to CSV`);
    }

    async logout() {
        if (confirm('Are you sure you want to logout?')) {
            try {
                if (this.auth) {
                    await this.auth.signOut();
                }
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Logout error:', error);
                window.location.href = 'index.html';
            }
        }
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.admin = new AdminDashboard();
});
