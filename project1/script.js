$(document).ready(function() {
    // --- DATA STORE & STATE MANAGEMENT ---
    let images = [];
    let folders = [];
    let albums = [];
    let activeView = { type: 'folder', name: 'All Images' };
    let currentModalImages = [];
    let cropper = null;
    const modalImage = document.getElementById('modalImage');

    // **DEFINITIVE FIX**: This default data is now correctly included to ensure images display on first load.
    const defaultImages = [
        { id: 1, thumb: 'https://picsum.photos/id/10/400/300', full: 'https://picsum.photos/id/10/1920/1080', folder: 'Landscapes', isDeleted: false },
        { id: 2, thumb: 'https://picsum.photos/id/25/400/300', full: 'https://picsum.photos/id/25/1920/1080', folder: 'Landscapes', isDeleted: false },
        { id: 3, thumb: 'https://picsum.photos/id/33/400/300', full: 'https://picsum.photos/id/33/1920/1080', folder: 'Portraits', isDeleted: false },
        { id: 4, thumb: 'https://picsum.photos/id/48/400/300', full: 'https://picsum.photos/id/48/1920/1080', folder: 'Cityscapes', isDeleted: false },
        { id: 5, thumb: 'https://picsum.photos/id/54/400/300', full: 'https://picsum.photos/id/54/1920/1080', folder: 'Landscapes', isDeleted: false },
        { id: 6, thumb: 'https://picsum.photos/id/66/400/300', full: 'https://picsum.photos/id/66/1920/1080', folder: 'Portraits', isDeleted: false },
        { id: 7, thumb: 'https://picsum.photos/id/71/400/300', full: 'https://picsum.photos/id/71/1920/1080', folder: 'Animals', isDeleted: false },
        { id: 8, thumb: 'https://picsum.photos/id/88/400/300', full: 'https://picsum.photos/id/88/1920/1080', folder: 'Cityscapes', isDeleted: false },
        { id: 9, thumb: 'https://picsum.photos/id/96/400/300', full: 'https://picsum.photos/id/96/1920/1080', folder: 'Animals', isDeleted: false }
    ];
    const defaultFolders = ['Landscapes', 'Portraits', 'Cityscapes', 'Animals'];
    
    function saveState() {
        try {
            const appState = { images, folders, albums };
            localStorage.setItem('photoAppState', JSON.stringify(appState));
        } catch (e) { console.error("Error saving state to localStorage", e); }
    }

    function loadState() {
        try {
            const savedState = localStorage.getItem('photoAppState');
            if (savedState) {
                const appState = JSON.parse(savedState);
                if (!appState || !appState.images || !appState.folders || appState.images.length === 0) {
                    images = defaultImages;
                    folders = defaultFolders;
                    albums = [];
                } else {
                    images = appState.images;
                    folders = appState.folders;
                    albums = appState.albums || [];
                }
            } else {
                images = defaultImages;
                folders = defaultFolders;
                albums = [];
            }
        } catch (e) {
            console.error("Error loading state from localStorage", e);
            images = defaultImages; folders = defaultFolders; albums = [];
        }
    }
    
    // --- RENDER FUNCTIONS ---
    function renderFolders() {
        const folderList = $('#folder-list');
        folderList.empty();
        ['All Images', ...folders, 'Trash'].forEach(folder => {
            const isDeletable = !['All Images', 'Trash'].includes(folder);
            const deleteIcon = isDeletable ? `<i class="fas fa-times delete-folder-icon" title="Delete Folder"></i>` : '';
            const icon = folder === 'Trash' ? 'fa-trash-alt' : (folder === 'All Images' ? 'fa-images' : 'fa-folder');
            const item = $(`<li class="folder-item ${activeView.type === 'folder' && activeView.name === folder ? 'active' : ''}" data-folder="${folder}"><span class="folder-name"><i class="fas ${icon}"></i> ${folder}</span>${deleteIcon}</li>`);
            folderList.append(item);
        });
    }

    function renderAlbums() {
        const albumList = $('#album-list');
        albumList.empty();
        albums.forEach(album => {
            const deleteIcon = `<i class="fas fa-times delete-folder-icon delete-album-icon" title="Delete Album"></i>`;
            const item = $(`<li class="folder-item ${activeView.type === 'album' && activeView.name === album.name ? 'active' : ''}" data-album-name="${album.name}"><div class="folder-name"><i class="fas fa-book"></i> ${album.name}</div>${deleteIcon}</li>`);
            albumList.append(item);
        });
    }

    function renderImages() {
        const imageGrid = $('#image-grid');
        imageGrid.empty();
        $('#current-view-title').text(activeView.name);
        
        let imagesToRender = [];
        if (activeView.type === 'folder') {
            if (activeView.name === 'All Images') imagesToRender = images.filter(img => !img.isDeleted);
            else if (activeView.name === 'Trash') imagesToRender = images.filter(img => img.isDeleted);
            else imagesToRender = images.filter(img => img.folder === activeView.name && !img.isDeleted);
        } else if (activeView.type === 'album') {
            const album = albums.find(a => a.name === activeView.name);
            if (album) imagesToRender = images.filter(img => album.imageIds.includes(img.id) && !img.isDeleted);
        }
        currentModalImages = imagesToRender;

        if (imagesToRender.length === 0) {
            imageGrid.html('<p class="col-12 text-muted mt-4">This view is empty.</p>');
            return;
        }

        imagesToRender.forEach(img => {
            const actions = activeView.name === 'Trash'
                ? `<i class="fas fa-undo-alt overlay-icon restore-icon" title="Restore"></i>`
                : `<i class="fas fa-plus-square overlay-icon add-to-album-icon" title="Add to Album"></i>
                   <i class="fas fa-edit overlay-icon edit-icon" title="Move to folder"></i>
                   <i class="fas fa-trash-alt overlay-icon delete-icon" title="Delete"></i>`;
            const itemHTML = `<div class="col-lg-4 col-md-6 col-sm-12 mb-4"><div class="gallery-item" data-id="${img.id}"><img src="${img.thumb}" class="img-fluid"><div class="overlay"><i class="fas fa-expand overlay-icon view-icon" title="View"></i><i class="fas fa-download overlay-icon download-icon" title="Download Original"></i>${actions}</div></div></div>`;
            imageGrid.append(itemHTML);
        });
    }
    
    function renderAll() { renderFolders(); renderAlbums(); renderImages(); }

    // --- EVENT HANDLERS ---
    
    $('#upload-btn').on('click', () => $('#file-input').click());
    $('#file-input').on('change', function(event) {
        const files = event.target.files;
        for (const file of files) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const newImage = {
                    id: Date.now() + Math.random(),
                    thumb: e.target.result,
                    full: e.target.result,
                    folder: (activeView.type !== 'folder' || ['All Images', 'Trash'].includes(activeView.name)) ? (folders[0] || 'Uncategorized') : activeView.name,
                    isDeleted: false
                };
                images.push(newImage);
                renderImages();
                saveState();
            };
            reader.readAsDataURL(file);
        }
        $(this).val('');
    });

    $('#add-folder-btn').on('click', function() {
        const folderName = $('#new-folder-name').val().trim();
        if (folderName && !folders.includes(folderName) && !['All Images', 'Trash'].includes(folderName)) {
            folders.push(folderName);
            renderFolders();
            saveState();
            $('#new-folder-name').val('');
        } else { alert("Folder name is empty, a reserved name, or already exists."); }
    });

    $('#add-album-btn').on('click', function() {
        const albumName = $('#new-album-name').val().trim();
        if (albumName && !albums.find(a => a.name === albumName)) {
            albums.push({ id: Date.now(), name: albumName, imageIds: [] });
            renderAlbums();
            saveState();
            $('#new-album-name').val('');
        } else { alert("Album name is empty or already exists."); }
    });

    $('#folder-list').on('click', '.folder-item', function() { activeView = { type: 'folder', name: $(this).data('folder') }; renderAll(); });
    $('#album-list').on('click', '.folder-item', function() { activeView = { type: 'album', name: $(this).data('album-name') }; renderAll(); });

    $('#folder-list').on('click', '.delete-folder-icon', function(e) {
        e.stopPropagation();
        const folderToDelete = $(this).closest('.folder-item').data('folder');
        if (confirm(`Are you sure you want to delete the "${folderToDelete}" folder? All images inside will be moved to the Trash.`)) {
            images.forEach(img => { if (img.folder === folderToDelete) img.isDeleted = true; });
            folders = folders.filter(f => f !== folderToDelete);
            activeView = { type: 'folder', name: 'All Images' };
            renderAll();
            saveState();
        }
    });

    $('#album-list').on('click', '.delete-album-icon', function(e) {
        e.stopPropagation();
        const albumToDelete = $(this).closest('.folder-item').data('album-name');
        if (confirm(`Are you sure you want to delete the "${albumToDelete}" album? The images will NOT be deleted.`)) {
            albums = albums.filter(a => a.name !== albumToDelete);
            if (activeView.type === 'album' && activeView.name === albumToDelete) {
                activeView = { type: 'folder', name: 'All Images' };
            }
            renderAll();
            saveState();
        }
    });

    $('#image-grid').on('click', '.overlay-icon', function(e) {
        e.stopPropagation();
        const imageId = parseFloat($(this).closest('.gallery-item').data('id'));
        const image = images.find(img => img.id === imageId);
        if (!image) return;

        if ($(this).hasClass('view-icon')) {
            const startIndex = currentModalImages.findIndex(img => img.id === imageId);
            if (startIndex > -1) openModal(startIndex);
        } else if ($(this).hasClass('download-icon')) {
            triggerDownload(image.full, `image-${image.id}.jpg`);
        } else if ($(this).hasClass('add-to-album-icon')) {
            const albumSelectionList = $('#album-selection-list');
            albumSelectionList.empty();
            if (albums.length === 0) {
                albumSelectionList.html('<p>No albums created yet. Please create an album first.</p>');
            } else {
                albums.forEach(album => {
                    const isChecked = album.imageIds.includes(imageId) ? 'checked' : '';
                    albumSelectionList.append(`<div class="form-check"><input class="form-check-input" type="checkbox" value="${album.id}" id="album-${album.id}" ${isChecked}><label class="form-check-label" for="album-${album.id}">${album.name}</label></div>`);
                });
            }
            $('#albumModal').data('imageId', imageId).modal('show');
        } else if ($(this).hasClass('edit-icon')) {
            const folderSelect = $('#folder-select');
            folderSelect.empty();
            folders.forEach(f => { if(f !== image.folder) folderSelect.append(`<option value="${f}">${f}</option>`); });
            $('#moveModal').data('imageId', imageId).modal('show');
        } else if ($(this).hasClass('delete-icon')) {
            image.isDeleted = true;
            renderImages();
            saveState();
        } else if ($(this).hasClass('restore-icon')) {
            image.isDeleted = false;
            renderImages();
            saveState();
        }
    });

    $('#confirm-move-btn').on('click', function() {
        const imageId = parseFloat($('#moveModal').data('imageId'));
        const newFolder = $('#folder-select').val();
        const image = images.find(img => img.id === imageId);
        if (image && newFolder) image.folder = newFolder;
        $('#moveModal').modal('hide');
        renderImages();
        saveState();
    });

    $('#confirm-album-add-btn').on('click', function() {
        const imageId = parseFloat($('#albumModal').data('imageId'));
        $('#album-selection-list .form-check-input').each(function() {
            const albumId = parseInt($(this).val());
            const album = albums.find(a => a.id === albumId);
            if (!album) return;
            const imageInAlbum = album.imageIds.includes(imageId);
            if ($(this).is(':checked') && !imageInAlbum) album.imageIds.push(imageId);
            else if (!$(this).is(':checked') && imageInAlbum) album.imageIds = album.imageIds.filter(id => id !== imageId);
        });
        $('#albumModal').modal('hide');
        saveState();
    });

    // --- UTILITY & MODAL LOGIC ---
    function triggerDownload(url, filename) {
        fetch(url, { mode: 'cors' })
            .then(response => response.blob())
            .then(blob => {
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = filename;
                link.click();
                URL.revokeObjectURL(link.href);
            }).catch(() => alert('Could not download image. This may be due to browser security restrictions.'));
    }
    
    $('#downloadBtn').on('click', () => {
        const currentImage = currentModalImages[currentModalIndex];
        if (currentImage) triggerDownload(currentImage.full, `image-${currentImage.id}.jpg`);
    });
    
    let currentModalIndex = 0;
    function openModal(startIndex) {
        currentModalIndex = startIndex;
        $('#imageModal').modal('show');
    }
    
    function updateModalImage() {
        if (currentModalImages.length > 0 && currentModalImages[currentModalIndex]) {
            const imageUrl = currentModalImages[currentModalIndex].full;
            if (cropper) cropper.replace(imageUrl);
            else modalImage.src = imageUrl;
        }
    }

    $('#nextBtn').on('click', function() { if (currentModalImages.length > 0) { currentModalIndex = (currentModalIndex + 1) % currentModalImages.length; updateModalImage(); } });
    $('#prevBtn').on('click', function() { if (currentModalImages.length > 0) { currentModalIndex = (currentModalIndex - 1 + currentModalImages.length) % currentModalImages.length; updateModalImage(); } });
    $('#zoom-in').on('click', () => cropper && cropper.zoom(0.1));
    $('#zoom-out').on('click', () => cropper && cropper.zoom(-0.1));

    $('#imageModal').on('shown.bs.modal', function() {
        if (cropper) cropper.destroy();
        cropper = new Cropper(modalImage, { viewMode: 1, dragMode: 'move', background: false, autoCrop: false, ready: () => $(modalImage).css('opacity', 1) });
        updateModalImage();
    });
    $('#imageModal').on('hidden.bs.modal', function() {
        if(cropper) { cropper.destroy(); cropper = null; }
        $(modalImage).css('opacity', 0).attr('src', '');
    });
    
    $('#cropBtn').on('click', function() {
        if (!cropper) return;
        if (cropper.cropped) {
            cropper.getCroppedCanvas({ width: 1024, height: 1024 }).toBlob(blob => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `cropped-image-${Date.now()}.png`;
                link.click();
                URL.revokeObjectURL(link.href);
            });
            cropper.clear();
        } else {
            cropper.crop(); 
        }
    });

    // --- INITIALIZATION ---
    function init() {
        loadState();
        renderAll();
    }
    init();
});
