def __init__(self):
    self.config = SmsProviderConfig.get_active()
    self._provider = None
    self.error_service = SmsErrorService()  # 🆕