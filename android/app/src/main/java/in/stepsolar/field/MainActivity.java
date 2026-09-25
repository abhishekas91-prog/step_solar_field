package in.stepsolar.field;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    disableWebViewDark();
  }

  @Override
  public void onStart() {
    super.onStart();
    disableWebViewDark();
  }

  private void disableWebViewDark() {
    if (getBridge() == null) return;
    WebView webView = getBridge().getWebView();
    if (webView == null) return;
    webView.setBackgroundColor(Color.WHITE);
    WebSettings settings = webView.getSettings();
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        settings.setForceDark(WebSettings.FORCE_DARK_OFF);
      }
    } catch (Throwable ignored) {
    }
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        settings.setAlgorithmicDarkeningAllowed(false);
      }
    } catch (Throwable ignored) {
    }
  }
}
