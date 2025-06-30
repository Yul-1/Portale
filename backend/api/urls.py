from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Crea il router per i ViewSets
router = DefaultRouter()
router.register(r'alloggi', views.AlloggioViewSet, basename='alloggio')

app_name = 'api'

urlpatterns = [
    # API root
    path('', views.api_root, name='api-root'),
    
    # Status endpoint
    path('status/', views.status_view, name='status'),
    
    # Include tutti gli URL del router (alloggi)
    path('', include(router.urls)),
]