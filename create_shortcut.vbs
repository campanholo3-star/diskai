Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile1 = "C:\Users\zeit-\Desktop\Diskai.lnk"
Set oLink1 = oWS.CreateShortcut(sLinkFile1)
oLink1.TargetPath = "C:\Users\zeit-\Desktop\Diskai\iniciar_diskai.bat"
oLink1.WorkingDirectory = "C:\Users\zeit-\Desktop\Diskai"
oLink1.IconLocation = "C:\Users\zeit-\Desktop\Diskai\diskai.ico,0"
oLink1.Description = "Diskai - Discord Inteligente com IA"
oLink1.Save

sLinkFile2 = "C:\Users\zeit-\Desktop\Diskai\Diskai.lnk"
Set oLink2 = oWS.CreateShortcut(sLinkFile2)
oLink2.TargetPath = "C:\Users\zeit-\Desktop\Diskai\iniciar_diskai.bat"
oLink2.WorkingDirectory = "C:\Users\zeit-\Desktop\Diskai"
oLink2.IconLocation = "C:\Users\zeit-\Desktop\Diskai\diskai.ico,0"
oLink2.Description = "Diskai - Discord Inteligente com IA"
oLink2.Save
