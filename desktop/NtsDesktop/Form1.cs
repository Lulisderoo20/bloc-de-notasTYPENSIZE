using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace NtsDesktop;

public partial class Form1 : Form
{
    private readonly WebView2 webView = new();

    public Form1()
    {
        InitializeComponent();
        ConfigureWindow();
        ConfigureWebView();
    }

    protected override async void OnShown(EventArgs e)
    {
        base.OnShown(e);
        await InitializeWebViewAsync();
    }

    private void ConfigureWindow()
    {
        Text = "Bloc de notas NTS";
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(900, 560);

        var iconPath = Path.Combine(AppContext.BaseDirectory, "web", "assets", "nts-icon.ico");

        if (File.Exists(iconPath))
        {
            Icon = new Icon(iconPath);
        }
    }

    private void ConfigureWebView()
    {
        webView.Dock = DockStyle.Fill;
        webView.Margin = Padding.Empty;
        Controls.Add(webView);
        webView.BringToFront();
    }

    private async Task InitializeWebViewAsync()
    {
        var webRoot = Path.Combine(AppContext.BaseDirectory, "web");

        if (!Directory.Exists(webRoot))
        {
            MessageBox.Show(
                this,
                "No se encontraron los archivos de la interfaz web para iniciar la app.",
                "Bloc de notas NTS",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);

            Close();
            return;
        }

        var userDataFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "BlocDeNotasNTS",
            "WebView2");

        Directory.CreateDirectory(userDataFolder);

        var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: userDataFolder);

        await webView.EnsureCoreWebView2Async(environment);
        webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
        webView.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = false;
        webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
        webView.CoreWebView2.DownloadStarting += HandleDownloadStarting;
        webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
            "nts.local",
            webRoot,
            CoreWebView2HostResourceAccessKind.Allow);
        webView.CoreWebView2.Navigate("https://nts.local/index.html");
    }

    private void HandleDownloadStarting(object? sender, CoreWebView2DownloadStartingEventArgs e)
    {
        using var dialog = new SaveFileDialog();

        dialog.Title = "Guardar archivo";
        dialog.FileName = Path.GetFileName(e.ResultFilePath);
        dialog.Filter =
            "Documentos de texto (*.txt)|*.txt|Documentos HTML (*.html;*.htm)|*.html;*.htm|Todos los archivos (*.*)|*.*";
        dialog.RestoreDirectory = true;

        if (dialog.ShowDialog(this) != DialogResult.OK)
        {
            e.Cancel = true;
            return;
        }

        e.ResultFilePath = dialog.FileName;
    }
}
