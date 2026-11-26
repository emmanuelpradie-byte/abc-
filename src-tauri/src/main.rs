// Mon Fournil — Maison Viennet : fenêtre Windows qui ouvre l'appli en ligne
// (https://emmanuelpradie-byte.github.io/abc-/), donc toujours à jour.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("erreur au lancement de Mon Fournil");
}
