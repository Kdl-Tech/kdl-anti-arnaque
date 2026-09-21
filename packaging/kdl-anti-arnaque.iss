; Installateur Windows de KDL Anti-arnaque — Inno Setup 6.
; Même méthode que KDL Toolbox : utilisateur courant, aucune élévation (pas d'UAC),
; runtime Node OFFICIEL non modifié lancé sans fenêtre par conhost.exe --headless.
; Construction : node packaging/construire.js windows   (poste de dev)
;                ISCC.exe packaging\kdl-anti-arnaque.iss (Windows)

#ifndef Version
  #define Version "1.1.0"
#endif
; Identifiant fixe : une nouvelle version remplace l'ancienne. Ne jamais le changer.
#define AppGuid "{9C3F6A2E-51B7-4D0B-8E4A-2F7D1C6B9A35}"

[Setup]
AppId={{#AppGuid}
AppName=KDL Anti-arnaque
AppVersion={#Version}
AppVerName=KDL Anti-arnaque {#Version}
AppPublisher=KDL TECH
AppPublisherURL=https://kdl-tech.fr/
AppSupportURL=https://kdl-tech.fr/logiciels/kdl-anti-arnaque/
VersionInfoVersion={#Version}
VersionInfoCompany=KDL TECH
VersionInfoDescription=Installateur de KDL Anti-arnaque
DefaultDirName={autopf}\KDL Anti-arnaque
DefaultGroupName=KDL TECH
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
UninstallDisplayName=KDL Anti-arnaque
UninstallDisplayIcon={app}\kdl-anti-arnaque.ico
SetupIconFile=kdl-anti-arnaque.ico
OutputDir=..\dist\windows
OutputBaseFilename=KDL-Anti-arnaque-Setup-{#Version}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
ArchitecturesAllowed=x64compatible
CloseApplications=force
RestartApplications=no
SetupMutex=KDL-Anti-arnaque-Setup

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[CustomMessages]
french.Bureau=Créer un raccourci sur le Bureau
french.Lancer=Ouvrir KDL Anti-arnaque

[Tasks]
Name: "bureau"; Description: "{cm:Bureau}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "..\dist\windows\kdl-anti-arnaque\runtime\*"; DestDir: "{app}\runtime"; Flags: ignoreversion
Source: "..\dist\windows\kdl-anti-arnaque\kdl-anti-arnaque.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dist\windows\kdl-anti-arnaque\app\*"; DestDir: "{app}\app"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\KDL Anti-arnaque"; Filename: "{sys}\conhost.exe"; Parameters: "--headless ""{app}\runtime\node.exe"" ""{app}\app\lancer.js"""; WorkingDir: "{app}"; IconFilename: "{app}\kdl-anti-arnaque.ico"; Comment: "Vérifier un SMS, un mail ou un lien suspect"
Name: "{group}\{cm:UninstallProgram,KDL Anti-arnaque}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\KDL Anti-arnaque"; Filename: "{sys}\conhost.exe"; Parameters: "--headless ""{app}\runtime\node.exe"" ""{app}\app\lancer.js"""; WorkingDir: "{app}"; IconFilename: "{app}\kdl-anti-arnaque.ico"; Tasks: bureau

[Run]
Filename: "{sys}\conhost.exe"; Parameters: "--headless ""{app}\runtime\node.exe"" ""{app}\app\lancer.js"""; WorkingDir: "{app}"; Description: "{cm:Lancer}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Le programme seulement. Les données (%LOCALAPPDATA%\KDL\Anti-arnaque : historique,
; journal) restent à l'utilisateur.
Type: filesandordirs; Name: "{app}"

[Messages]
french.FinishedLabel=KDL Anti-arnaque est installé. Il s'ouvre dans votre navigateur ; pour le fermer : bouton « Fermer KDL Anti-arnaque » en bas de page. La désinstallation ne supprime pas votre historique.

[Code]
// Arrêt de SON runtime (chemin exact, jamais les autres node.exe) avant mise à jour
// ou désinstallation. WMI : fonctionne depuis l'installateur 32 bits.
procedure ArreterAntiArnaque;
var Chemin, Cmd: String; R: Integer;
begin
  Chemin := ExpandConstant('{app}\runtime\node.exe');
  StringChangeEx(Chemin, '''', '''''', True);
  Cmd := '-NoProfile -NonInteractive -Command "Get-CimInstance -ClassName Win32_Process | Where-Object { $_.Name -eq ''node.exe'' -and $_.ExecutablePath -eq ''' + Chemin + ''' } | Invoke-CimMethod -MethodName Terminate | Out-Null"';
  Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), Cmd, '', SW_HIDE, ewWaitUntilTerminated, R);
  Sleep(1000);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  if FileExists(ExpandConstant('{app}\runtime\node.exe')) then ArreterAntiArnaque;
  Result := '';
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then ArreterAntiArnaque;
end;
