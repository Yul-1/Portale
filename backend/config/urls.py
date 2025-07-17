# backend/config/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # Includi tutte le URL definite nell'app 'api'
    path('api/', include('api.urls')), 
]
