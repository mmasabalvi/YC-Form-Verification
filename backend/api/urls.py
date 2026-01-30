from django.urls import path
from .views import health_check, submit_kyc, submit_account_form, ExtractCNICDetailsView, get_kyc_data, transfer_intent, request_callback

urlpatterns = [
    path("health", health_check, name="health"),
    path("submit-kyc", submit_kyc, name="submit_kyc"),
    path("submit-account-form", submit_account_form, name="submit_account_form"),
    path("extract-cnic", ExtractCNICDetailsView.as_view(), name="extract_cnic"),
    path("get-kyc-data", get_kyc_data, name="get_kyc_data"),
    path("transfer-intent", transfer_intent, name="transfer_intent"),
    path("request-callback", request_callback, name="request_callback"),
]
