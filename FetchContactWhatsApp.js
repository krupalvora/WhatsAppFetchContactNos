// Javascript code to fetch contact no, name form whatsapp grp. Run this script in console of webwhatsapp and enter Exact group name.

class ContactFinder {
    #db;
    #chatToFind;
    #dbName = "model-storage";
    #chatsCol = "chat";
    #contactCol = "contact";
    #groupCol = "participant";

    constructor(chatGroupName) {
        this.#chatToFind = chatGroupName;
    }

    async openConnection() {
        if (!this.#db) {
            const dbName = this.#dbName;
            this.#db = await new Promise((resolve, reject) => {
                let request = indexedDB.open(dbName);
                request.onerror = (event) => {
                    reject(event);
                };
                request.onsuccess = (event) => {
                    resolve(event.target.result);
                };
            });
        }
        return this.#db;
    }

    async #promisifyCol(collection, query, count) {
        const db = await this.openConnection();
        return new Promise((resolve, reject) => {
            const request = db.transaction(collection).objectStore(collection).getAll(query, count);

            request.onerror = (event) => {
                reject(event);
            };
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        });
    }

    async #getChats() {
        const allChats = await this.#promisifyCol(this.#chatsCol);
        const chatToFind = this.#chatToFind;
        return allChats.filter((chat) => {
            return chat.name && chat.name.includes(chatToFind);
        });
    }

    async #getGroups() {
        const chats = (await this.#getChats()).map((chat) => chat.id);
        const allGroups = await this.#promisifyCol(this.#groupCol);

        return allGroups.filter((group) => {
            return group.groupId && chats.includes(group.groupId);
        });
    }

    async #getGroupParticipants() {
        const groups = await this.#getGroups();
        const map = new Map();

        groups.forEach((group) => {
            group.participants.forEach((par) => {
                const num = par.replace("@c.us", "");
                map.set(num, num);
            });
        });

        return map;
    }

    async #getContacts() {
        return this.#promisifyCol(this.#contactCol);
    }

    async getGroupMembers() {
        const members = await this.#getGroupParticipants();
        const contacts = await this.#getContacts();

        contacts.forEach((contact) => {
            var num;
            if (contact.phoneNumber) {
                num = contact.phoneNumber.split("@")[0];
            } else if (contact.id) {
                num = contact.id.split("@")[0];
            }
            if (num && members.get(num)) {
                members.set(num, {
                    phoneNum: num,
                    name: contact.name,
                    pushname: contact.pushname,
                });
            }
        });
        return members;
    }

    async downloadMembersAsCSV() {
        const members = await this.getGroupMembers();
        let csvContent = "data:text/csv;charset=utf-8,";

        // Add headers
        csvContent += "Number,Saved Name,Kept Name\r\n";

        for (const [key, value] of members.entries()) {
            const phoneNum = `'${value.phoneNum}`; // Prepend an apostrophe to the phone number
            const savedName = value.name ? value.name : "";
            const keptName = value.pushname ? value.pushname : "";

            const row = `"${phoneNum}","${savedName}","${keptName}"\r\n`; // Enclose values in quotes
            csvContent += row;
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "my_data.csv");
        document.body.appendChild(link); // Required for FF

        link.click();
    }
}


(async () => {
    function myFunction() {
        let grp = prompt("Please enter Group name:", "");
        if (grp == null || grp == "") {
            alert("No Group found");
            return null;
        } else {
            return grp; 
        }
    }
    
    const grp = myFunction(); 
    if (grp !== null) {
        const contactFinder = new ContactFinder(grp);
        const members = await contactFinder.getGroupMembers(); 
        console.log(members);
        await contactFinder.downloadMembersAsCSV(); 
    }
})();
