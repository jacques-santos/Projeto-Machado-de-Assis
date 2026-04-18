"""
Custom pagination classes for the API
"""

from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """
    Custom pagination class that allows up to 100000 items per page
    """
    page_size_query_param = 'page_size'
    max_page_size = 100000
