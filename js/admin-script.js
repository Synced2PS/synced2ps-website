// Mock data for demonstration
const mockBookings = [
    { id: 1, name: "John Smith", email: "john@example.com", phone: "+1-234-567-8901", plan: "Pro", date: "2024-01-15", status: "confirmed", amount: 299 },
    { id: 2, name: "Emma Johnson", email: "emma@example.com", phone: "+1-234-567-8902", plan: "Basic", date: "2024-01-16", status: "pending", amount: 99 },
    { id: 3, name: "Michael Brown", email: "michael@example.com", phone: "+1-234-567-8903", plan: "Enterprise", date: "2024-01-14", status: "completed", amount: 599 },
    { id: 4, name: "Sarah Davis", email: "sarah@example.com", phone: "+1-234-567-8904", plan: "Pro", date: "2024-01-17", status: "confirmed", amount: 299 },
    { id: 5, name: "Robert Wilson", email: "robert@example.com", phone: "+1-234-567-8905", plan: "Basic", date: "2024-01-13", status: "cancelled", amount: 99 },
    { id: 6, name: "Lisa Miller", email: "lisa@example.com", phone: "+1-234-567-8906", plan: "Pro", date: "2024-01-18", status: "pending", amount: 299 }
];

class AdminDashboard {
    constructor() {
        this.bookings = [];
        this.filteredBookings = [];
        this.initializeElements();
        this.bindEvents();
        this.loadBookings();
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
        this.elements.retryBtn.addEventListener('click', () => this.loadBookings());
        this.elements.refreshBtn.addEventListener('click', () => this.loadBookings());
        this.elements.exportBtn.addEventListener('click', () => this.exportToCSV());
        
        this.elements.searchInput.addEventListener('input', () => this.applyFilters());
        this.elements.planFilter.addEventListener('change', () => this.applyFilters());
        this.elements.dateFilter.addEventListener('change', () => this.applyFilters());
        this.elements.statusFilter.addEventListener('change', () => this.applyFilters());
        
        document.querySelector('.logout-btn').addEventListener('click', () => this.logout());
    }

    async loadBookings() {
        try {
            this.showLoading();
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // In production, replace this with actual API call
            // const response = await fetch('/api/bookings');
            // this.bookings = await response.json();
            
            this.bookings = mockBookings;
            this.filteredBookings = [...this.bookings];
            
            this.renderBookings();
            this.updateStats();
            this.showTable();
            
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.showError(error.message || 'Cannot read properties of null (reading \'style\')');
        }
    }

    showLoading() {
        this.elements.loadingSpinner.style.display = 'block';
        this.elements.errorMessage.style.display = 'none';
        this.elements.bookingsTable.style.display = 'none';
    }

    showError(message) {
        this.elements.loadingSpinner.style.display = 'none';
        this.elements.errorMessage.style.display = 'block';
        this.elements.errorText.textContent = message;
        this.elements.bookingsTable.style.display = 'none';
    }

    showTable() {
        this.elements.loadingSpinner.style.display = 'none';
        this.elements.errorMessage.style.display = 'none';
        this.elements.bookingsTable.style.display = 'block';
    }

    renderBookings() {
        const tbody = this.elements.bookingsTableBody;
        tbody.innerHTML = '';

        this.filteredBookings.forEach(booking => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>#${booking.id}</td>
                <td>${booking.name}</td>
                <td>${booking.email}</td>
                <td>${booking.phone}</td>
                <td>${booking.plan}</td>
                <td>${this.formatDate(booking.date)}</td>
                <td><span class="status-badge status-${booking.status}">${booking.status.toUpperCase()}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn action-view" onclick="admin.viewBooking(${booking.id})">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="action-btn action-edit" onclick="admin.editBooking(${booking.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="action-btn action-delete" onclick="admin.deleteBooking(${booking.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    applyFilters() {
        let filtered = [...this.bookings];
        
        // Apply plan filter
        const planFilter = this.elements.planFilter.value;
        if (planFilter !== 'all') {
            filtered = filtered.filter(booking => booking.plan.toLowerCase() === planFilter);
        }
        
        // Apply status filter
        const statusFilter = this.elements.statusFilter.value;
        if (statusFilter !== 'all') {
            filtered = filtered.filter(booking => booking.status === statusFilter);
        }
        
        // Apply date filter
        const dateFilter = this.elements.dateFilter.value;
        if (dateFilter !== 'all') {
            const today = new Date();
            filtered = filtered.filter(booking => {
                const bookingDate = new Date(booking.date);
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
            });
        }
        
        // Apply search filter
        const searchTerm = this.elements.searchInput.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(booking => 
                booking.name.toLowerCase().includes(searchTerm) ||
                booking.email.toLowerCase().includes(searchTerm) ||
                booking.phone.includes(searchTerm)
            );
        }
        
        this.filteredBookings = filtered;
        this.renderBookings();
    }

    updateStats() {
        const total = this.bookings.length;
        const pending = this.bookings.filter(b => b.status === 'pending').length;
        const confirmed = this.bookings.filter(b => b.status === 'confirmed').length;
        const revenue = this.bookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
        
        this.elements.totalBookings.textContent = total;
        this.elements.pendingBookings.textContent = pending;
        this.elements.confirmedBookings.textContent = confirmed;
        this.elements.totalRevenue.textContent = `$${revenue}`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    exportToCSV() {
        const headers = ['ID', 'Name', 'Email', 'Phone', 'Plan', 'Date', 'Status', 'Amount'];
        const csvContent = [
            headers.join(','),
            ...this.bookings.map(b => [
                b.id,
                `"${b.name}"`,
                b.email,
                b.phone,
                b.plan,
                b.date,
                b.status,
                b.amount
            ].join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookings_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        alert('CSV export started!');
    }

    viewBooking(id) {
        const booking = this.bookings.find(b => b.id === id);
        alert(`Viewing booking #${id}\nCustomer: ${booking.name}\nPlan: ${booking.plan}\nStatus: ${booking.status}`);
    }

    editBooking(id) {
        const booking = this.bookings.find(b => b.id === id);
        const newStatus = prompt(`Edit booking #${id}\nCurrent status: ${booking.status}\nEnter new status (pending/confirmed/cancelled/completed):`, booking.status);
        
        if (newStatus && ['pending', 'confirmed', 'cancelled', 'completed'].includes(newStatus.toLowerCase())) {
            booking.status = newStatus.toLowerCase();
            this.renderBookings();
            this.updateStats();
            alert('Booking updated successfully!');
        }
    }

    deleteBooking(id) {
        if (confirm('Are you sure you want to delete this booking?')) {
            this.bookings = this.bookings.filter(b => b.id !== id);
            this.applyFilters();
            this.updateStats();
            alert('Booking deleted successfully!');
        }
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            // In production, implement actual logout logic
            window.location.href = '/login';
        }
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.admin = new AdminDashboard();
});
