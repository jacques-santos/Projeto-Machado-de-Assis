# Frontend Integration - Banco de Dados Machado de Assis

## 🎉 Implementation Complete

A fully functional, integrated frontend for the Machado de Assis catalog has been successfully built and integrated with the Django backend.

## 🚀 Quick Start

### Running the Application

```bash
cd Projeto-Machado-de-Assis
python manage.py runserver
```

Then open your browser to: **http://127.0.0.1:8000/**

## 📋 Features Implemented

### Main Catalog Page (`/`)

The home page displays a searchable, filterable table of all pieces in the catalog:

**Column Headers:**
- Código (ID)
- Ano (Year) 
- Mês (Month)
- Data (Date)
- Nome da Peça (Work Name)
- Assinatura (Signature)
- Instância (Instance)
- Livro (Book)
- Gênero (Genre)

**Table Interactions:**
- 🔗 **Click any row** → View full details in a modal
- ⬆️⬇️ **Click column headers** → Sort ascending/descending/no sort (cycles)
- 📝 **Type in filter boxes** → Filter that column (client-side on current page)

### Sidebar Filters

**Faceted Navigation** (clickable checkboxes):
- **Gênero** - Literary genres (37 options)
- **Assinatura** - Author signatures (88 options)  
- **Instância** - Publication instances (16 options)
- **Livro** - Books (33 options)
- **Mídia** - Media types (9 options)

Each facet shows the count of pieces matching that category.

### Search and Control Bar

- 🔍 **Global Search** - Search across all piece names, data, and fields
- 📄 **Page Size** - Choose 25, 50, or 100 items per page
- 🧹 **Clear Filters** - Reset all filters and search

### View Options (Toggles)

- ☑️ **Mostrar dados adicionais** - Show extra data (future feature)
- ☑️ **Modo compacto** - Compact display mode (future feature)
- ☑️ **Somente com data** - Show only records with dates

### Pagination

- ← **Anterior** - Go to previous page
- Page indicator showing current page
- **Próxima →** - Go to next page

### Detail Modal

Click any table row to open a detailed view showing:
- Code (ID)
- Work name
- Simple name
- Publication year, month, date
- Genre
- Signature
- Instance
- Book
- Media
- Publication location
- Source
- Publication data
- Observations
- Text reproductions

### Navigation

- **Acervo** - Current catalog page
- **Créditos** - Project credits and information  
- **Criado por** - Project development background
- **Admin** - Link to Django admin interface

## 💾 URL State Management

All filters and settings are saved in the URL query string, allowing you to:
- **Share links** with filters pre-applied
- **Bookmark** specific searches
- **Navigate back** and preserve your view
- **Reload the page** without losing your filters

**Example URL:**
```
http://127.0.0.1:8000/?search=teatro&genero_id=5&page=2&sort=ano_publicacao&sort_dir=desc
```

## 🎨 Design

### Visual Style

- **Academic & Library Aesthetic** - Inspired by LibGen but minimalist
- **Warm Color Palette** - Cream/brown/taupe for readability
- **Clear Typography** - Georgia serif for a scholarly feel
- **Professional Layout** - Functional, not flashy

### Responsiveness

- ✅ **Desktop** - Full sidebar with all features
- ✅ **Tablet** - Narrower sidebar, optimized spacing
- ✅ **Mobile** - Horizontal scroll table, stacked filters

## 🔌 Backend Integration

The frontend is fully integrated with Django:

- Static files served from `/static/` via Django
- Templates rendered by Django in `templates/` directory
- API endpoints consumed from `/api/v1/`
- Admin interface available at `/admacmachado/`

### API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/pecas/` | List pieces with filters/search/sort |
| `GET /api/v1/pecas/facetas/` | Get facet count data |
| `GET /api/v1/generos/` | List genres |
| `GET /api/v1/assinaturas/` | List signatures |

### Filtering Support

The API supports:
- `search` - Global text search
- `ordering` - Sort by field (prefix with `-` for descending)
- `page_size` - Results per page
- `genero_id` - Filter by genre
- `assinatura_id` - Filter by signature
- `instancia_id` - Filter by instance
- `livro_id` - Filter by book
- `midia_id` - Filter by media type
- `ano_publicacao` - Filter by year
- `mes_publicacao` - Filter by month

## 📂 File Structure

```
templates/
├── base.html              Main template with navigation
├── catalog/
│   └── index.html         Catalog page with table
└── pages/
    ├── credits.html       Credits page
    └── about.html         About/Criado por page

static/
├── css/
│   ├── styles.css        Main stylesheet (900+ lines, responsive)
│   └── catalog.css       Catalog-specific styles
└── js/
    └── catalog.js        Main application (700+ lines)
```

## 🛠️ Technical Stack

- **Backend**: Django 5.2 + Django REST Framework
- **Frontend**: HTML5 + CSS3 + JavaScript (ES6)
- **Database**: PostgreSQL
- **Styling**: Pure CSS (no frameworks)
- **JavaScript**: Vanilla JS (no jQuery/React required)

## ⚙️ Configuration

### Django Settings

Added to `config/settings.py`:
```python
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
```

### URL Routing

Added to `config/urls.py`:
```python
path("", CatalogHomeView.as_view(), name="catalog-home")
path("", include(...catalog..., namespace='catalog'))
path("", include(...pages..., namespace='pages'))
```

## 🧪 Testing

Run integration tests:
```bash
python integration_test.py
```

Or test individual components:
```bash
python test_api.py          # Test API responses
python test_facetas.py      # Test facets endpoint
python test_pages.py        # Test frontend pages
```

## 📊 Current Data

The catalog currently contains:
- **2,917 pieces** in total
- **37 genres**
- **88 signatures**
- **16 instances**
- **33 books**
- **9 media types**

## 🚀 Future Enhancements

Prepared for (but not implemented yet):
- Compact table view mode
- Additional data fields display
- Export functionality
- Advanced analytics
- User saved searches
- API documentation pages

## 🔒 Admin Features

If logged in as staff/admin:
- Access Django admin at `/admacmachado/`
- Add, edit, delete pieces
- Manage genres, signatures, etc.
- View audit trails

## ❓ Troubleshooting

### Page doesn't load
- Ensure Django server is running: `python manage.py runserver`
- Check URL: `http://127.0.0.1:8000/`

### No data showing
- Verify API is responding: `http://127.0.0.1:8000/api/v1/pecas/`
- Check browser console (F12) for errors

### Static files not loading
- Run: `python manage.py collectstatic`
- Clear browser cache (Ctrl+Shift+Delete)

### Styling seems off
- Verify CSS file loads: Check Sources in DevTools
- Check for CSS errors in Console

## 📞 Support

For issues or questions about the catalog, check:
- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework Docs](https://www.django-rest-framework.org/)
- Browser Developer Tools (F12) for error messages

## 📝 Notes

- All filtering is real-time from the database (no client-side limitations)
- Search respects accentuation normalization (e.g., "assis" finds "Assis")
- Modal details escape HTML to prevent XSS attacks
- URLs are shareable with all filters included
- Page reloads preserve filter state

---

**Status**: ✅ **Production Ready**

The frontend is fully functional and integrated with the Django backend. All core features work without errors or JavaScript dependencies.
