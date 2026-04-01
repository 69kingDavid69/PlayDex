use keyring::{Entry, Error as KeyringError};
use anyhow::Result;

const SERVICE: &str = "playdex";
const USERNAME: &str = "deezer-arl";

pub async fn get_arl() -> Result<String> {
    let entry = Entry::new(SERVICE, USERNAME)?;
    match entry.get_password() {
        Ok(password) => Ok(password),
        Err(KeyringError::NoEntry) => Ok(String::new()),
        Err(e) => Err(e.into()),
    }
}

pub async fn save_arl(arl: String) -> Result<()> {
    let entry = Entry::new(SERVICE, USERNAME)?;
    if arl.is_empty() {
        let _ = entry.delete_password();
    } else {
        entry.set_password(&arl)?;
    }
    Ok(())
}