// Package main is the entry point for the crypto trading bot application.
// This application provides a desktop GUI for automated cryptocurrency trading
// using various technical analysis strategies and machine learning predictions.
package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

// main initializes and runs the Wails desktop application.
// It creates the application instance, configures window options,
// and starts the GUI with embedded frontend assets.
func main() {
	// Create application instance
	app := NewApp()

	// Configure and run Wails application
	err := wails.Run(&options.App{
		Title:  "Крипто Торговый Бот",
		Width:  1920,
		Height: 1080,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 15, G: 15, B: 15, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Bind: []interface{}{
			app,
		},
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			DisableWindowIcon:    false,
		},
	})

	if err != nil {
		log.Fatal("Error running application:", err)
	}
}
